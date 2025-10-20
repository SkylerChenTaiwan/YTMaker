"""進程管理器 - 自動管理 Redis 和 Celery Worker 的生命週期"""

import atexit
import logging
import platform
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

import redis

logger = logging.getLogger(__name__)


class ProcessManager:
    """管理背景服務（Redis 和 Celery Worker）的生命週期"""

    def __init__(self):
        self.redis_process = None
        self.worker_process = None
        self.beat_process = None
        self._cleanup_registered = False

    def start_all(self):
        """
        啟動所有必要的背景服務

        順序：
        1. 啟動 Redis (如果需要)
        2. 等待 Redis 就緒
        3. 啟動 Celery Worker
        4. 啟動 Celery Beat (定期任務)
        5. 註冊清理函數
        """
        logger.info("🚀 啟動背景服務...")

        try:
            # 1. 啟動 Redis
            self._start_redis()

            # 2. 等待 Redis 就緒
            self._wait_for_redis()

            # 3. 啟動 Celery Worker
            self._start_worker()

            # 4. 啟動 Celery Beat
            self._start_beat()

            # 5. 註冊清理函數
            if not self._cleanup_registered:
                atexit.register(self.stop_all)
                signal.signal(signal.SIGTERM, self._signal_handler)
                signal.signal(signal.SIGINT, self._signal_handler)
                self._cleanup_registered = True

            logger.info("✅ 所有背景服務已啟動")

        except Exception as e:
            logger.error(f"❌ 啟動背景服務失敗: {e}")
            self.stop_all()
            raise

    def _start_redis(self):
        """啟動 Redis 服務"""
        # 先檢查 Redis 是否已經在運行
        if self._check_redis_running():
            logger.info("✓ Redis 已經在運行中")
            return

        logger.info("啟動 Redis 服務...")

        system = platform.system()
        redis_port = 6379

        try:
            if system == "Darwin":  # macOS
                # 嘗試使用 redis-server
                redis_cmd = self._find_redis_server()
                if redis_cmd:
                    self.redis_process = subprocess.Popen(
                        [redis_cmd, "--port", str(redis_port), "--daemonize", "no"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                    )
                    logger.info("✓ Redis 已啟動 (使用 redis-server)")
                else:
                    raise FileNotFoundError("找不到 redis-server")

            elif system == "Linux":
                # Linux 使用 redis-server
                self.redis_process = subprocess.Popen(
                    ["redis-server", "--port", str(redis_port)],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                logger.info("✓ Redis 已啟動")

            elif system == "Windows":
                # Windows 使用 redis-server.exe 或 Docker
                logger.warning("Windows 系統建議使用 Docker 運行 Redis")
                logger.info("請執行: docker run -d -p 6379:6379 redis:alpine")
                raise NotImplementedError("Windows 需要手動啟動 Redis")

            else:
                raise NotImplementedError(f"不支援的系統: {system}")

        except Exception as e:
            logger.error(f"啟動 Redis 失敗: {e}")
            logger.info("提示：請確保已安裝 Redis 或使用 Docker")
            raise

    def _find_redis_server(self) -> Optional[str]:
        """尋找 redis-server 執行檔"""
        # 常見的 Redis 安裝路徑
        possible_paths = [
            "/opt/homebrew/bin/redis-server",  # Homebrew ARM Mac
            "/usr/local/bin/redis-server",  # Homebrew Intel Mac
            "/usr/bin/redis-server",  # Linux
            "redis-server",  # PATH
        ]

        for path in possible_paths:
            try:
                result = subprocess.run(
                    [path, "--version"],
                    capture_output=True,
                    timeout=2,
                )
                if result.returncode == 0:
                    return path
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue

        return None

    def _check_redis_running(self) -> bool:
        """檢查 Redis 是否已在運行"""
        try:
            r = redis.Redis(host="localhost", port=6379, db=0, socket_timeout=1)
            r.ping()
            return True
        except (redis.ConnectionError, redis.TimeoutError):
            return False

    def _wait_for_redis(self, max_wait=10):
        """等待 Redis 啟動完成"""
        logger.info("等待 Redis 就緒...")

        for _ in range(max_wait):
            if self._check_redis_running():
                logger.info("✓ Redis 已就緒")
                return
            time.sleep(1)

        raise TimeoutError("Redis 啟動超時")

    def _start_worker(self):
        """啟動 Celery Worker"""
        logger.info("啟動 Celery Worker...")

        # 獲取當前 Python 解釋器路徑
        python_exe = sys.executable

        # Worker 命令
        worker_cmd = [
            python_exe,
            "-m",
            "celery",
            "-A",
            "app.celery_app",
            "worker",
            "--loglevel=info",
            "--concurrency=2",  # 2 個並行 worker
        ]

        try:
            self.worker_process = subprocess.Popen(
                worker_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=Path(__file__).parent.parent,  # backend/ 目錄
            )
            logger.info("✓ Celery Worker 已啟動")

        except Exception as e:
            logger.error(f"啟動 Celery Worker 失敗: {e}")
            raise

    def _start_beat(self):
        """啟動 Celery Beat (定期任務調度器)"""
        logger.info("啟動 Celery Beat...")

        python_exe = sys.executable

        beat_cmd = [
            python_exe,
            "-m",
            "celery",
            "-A",
            "app.celery_app",
            "beat",
            "--loglevel=info",
        ]

        try:
            self.beat_process = subprocess.Popen(
                beat_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=Path(__file__).parent.parent,
            )
            logger.info("✓ Celery Beat 已啟動")

        except Exception as e:
            logger.error(f"啟動 Celery Beat 失敗: {e}")
            raise

    def stop_all(self):
        """停止所有背景服務"""
        logger.info("🛑 停止背景服務...")

        # 停止 Beat
        if self.beat_process:
            try:
                self.beat_process.terminate()
                self.beat_process.wait(timeout=5)
                logger.info("✓ Celery Beat 已停止")
            except Exception as e:
                logger.warning(f"停止 Celery Beat 時發生錯誤: {e}")
                self.beat_process.kill()

        # 停止 Worker
        if self.worker_process:
            try:
                self.worker_process.terminate()
                self.worker_process.wait(timeout=5)
                logger.info("✓ Celery Worker 已停止")
            except Exception as e:
                logger.warning(f"停止 Celery Worker 時發生錯誤: {e}")
                self.worker_process.kill()

        # 停止 Redis (只停止我們啟動的)
        if self.redis_process:
            try:
                self.redis_process.terminate()
                self.redis_process.wait(timeout=5)
                logger.info("✓ Redis 已停止")
            except Exception as e:
                logger.warning(f"停止 Redis 時發生錯誤: {e}")
                self.redis_process.kill()

        logger.info("✅ 所有背景服務已停止")

    def _signal_handler(self, signum, frame):
        """處理終止信號"""
        logger.info(f"收到信號 {signum}，正在清理...")
        self.stop_all()
        sys.exit(0)

    def get_status(self) -> dict:
        """獲取所有服務的狀態"""
        return {
            "redis": {
                "running": self._check_redis_running(),
                "process": self.redis_process is not None,
            },
            "worker": {
                "process": self.worker_process is not None,
                "alive": (self.worker_process.poll() is None if self.worker_process else False),
            },
            "beat": {
                "process": self.beat_process is not None,
                "alive": (self.beat_process.poll() is None if self.beat_process else False),
            },
        }


# 全局實例
process_manager = ProcessManager()
