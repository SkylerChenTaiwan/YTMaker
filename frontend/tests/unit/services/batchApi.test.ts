import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'
import * as batchApi from '@/services/batchApi'

const mock = new MockAdapter(apiClient)

describe('Batch API', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('getBatchTasks', () => {
    it('should get all batch tasks', async () => {
      const mockTasks = [
        {
          id: 'batch-1',
          task_name: 'Batch Task 1',
          project_count: 5,
          status: 'RUNNING',
          success_count: 2,
          failed_count: 0,
          created_at: '2025-10-19',
        },
      ]

      mock.onGet('/batch').reply(200, mockTasks)

      const result = await batchApi.getBatchTasks()

      expect(result).toHaveLength(1)
      expect(result[0].task_name).toBe('Batch Task 1')
    })
  })

  describe('getBatchTask', () => {
    it('should get single batch task', async () => {
      const mockTask = {
        id: 'batch-1',
        task_name: 'Batch Task 1',
        project_count: 5,
        status: 'RUNNING',
        success_count: 2,
        failed_count: 0,
        created_at: '2025-10-19',
      }

      mock.onGet('/batch/batch-1').reply(200, mockTask)

      const result = await batchApi.getBatchTask('batch-1')

      expect(result.id).toBe('batch-1')
    })
  })

  describe('pauseBatchTask', () => {
    it('should pause batch task', async () => {
      mock.onPost('/batch/batch-1/pause').reply(200)

      await batchApi.pauseBatchTask('batch-1')

      expect(mock.history.post.length).toBe(1)
    })
  })

  describe('resumeBatchTask', () => {
    it('should resume batch task', async () => {
      mock.onPost('/batch/batch-1/resume').reply(200)

      await batchApi.resumeBatchTask('batch-1')

      expect(mock.history.post.length).toBe(1)
    })
  })

  describe('createBatchTask', () => {
    it('should create batch task with FormData', async () => {
      const mockFile1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
      const mockFile2 = new File(['content2'], 'file2.txt', { type: 'text/plain' })

      const batchData = {
        task_name: 'Test Batch',
        files: [mockFile1, mockFile2],
        template_id: 'template-1',
        prompt_template_id: 'prompt-1',
        gemini_model: 'gemini-1.5-pro' as const,
        youtube_config: {
          title: 'Test',
          description: 'Test',
          tags: ['test'],
          privacy: 'public' as const,
          publish_type: 'immediate' as const,
          ai_content_flag: true,
        },
      }

      mock.onPost('/batch').reply(201, {
        id: 'batch-123',
        task_name: 'Test Batch',
        project_count: 2,
        status: 'QUEUED',
        success_count: 0,
        failed_count: 0,
        created_at: '2025-10-21',
      })

      const result = await batchApi.createBatchTask(batchData)

      expect(result.id).toBe('batch-123')
      expect(result.task_name).toBe('Test Batch')
      expect(mock.history.post.length).toBe(1)
    })

    it('should create batch task without optional fields', async () => {
      const mockFile = new File(['content'], 'file.txt', { type: 'text/plain' })

      const batchData = {
        task_name: 'Test Batch',
        files: [mockFile],
        gemini_model: 'gemini-1.5-flash' as const,
        youtube_config: {
          title: 'Test',
          description: 'Test',
          tags: ['test'],
          privacy: 'unlisted' as const,
          publish_type: 'immediate' as const,
          ai_content_flag: false,
        },
      }

      mock.onPost('/batch').reply(201, {
        id: 'batch-456',
        task_name: 'Test Batch',
        project_count: 1,
        status: 'QUEUED',
        success_count: 0,
        failed_count: 0,
        created_at: '2025-10-21',
      })

      const result = await batchApi.createBatchTask(batchData)

      expect(result.id).toBe('batch-456')
    })
  })
})
