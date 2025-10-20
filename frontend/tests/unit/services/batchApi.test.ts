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
})
