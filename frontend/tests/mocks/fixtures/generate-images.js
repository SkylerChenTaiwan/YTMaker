/**
 * 生成測試用圖片
 *
 * 這個腳本會生成：
 * - test-image.png (1920x1080 測試圖片)
 * - test-logo.png (100x100 測試 Logo)
 */

const fs = require('fs')
const path = require('path')

/**
 * 生成最小的有效 PNG 圖片（1x1 透明像素）
 * 這是一個基礎圖片，實際測試時可以使用真實圖片替換
 */
function generateMinimalPNG() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR chunk type
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
    0x1f, 0x15, 0xc4, 0x89, // IHDR CRC
    0x00, 0x00, 0x00, 0x0a, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT chunk type
    0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
    0x0d, 0x0a, 0x2d, 0xb4, // IDAT CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4e, 0x44, // IEND chunk type
    0xae, 0x42, 0x60, 0x82, // IEND CRC
  ])
}

// 生成測試圖片
const testImagePath = path.join(__dirname, 'test-image.png')
const testLogoPath = path.join(__dirname, 'test-logo.png')

// 生成並儲存圖片
fs.writeFileSync(testImagePath, generateMinimalPNG())
fs.writeFileSync(testLogoPath, generateMinimalPNG())

console.log('✅ 測試圖片生成完成：')
console.log(`   - ${testImagePath}`)
console.log(`   - ${testLogoPath}`)
console.log('\n注意：這些是 1x1 像素的最小 PNG 圖片，僅用於測試。')
console.log('如需更真實的測試圖片，請手動替換這些檔案。')
