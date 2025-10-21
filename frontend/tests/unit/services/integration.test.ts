import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'
import * as projectsApi from '@/services/projectsApi'

const mock = new MockAdapter(apiClient)

describe('Integration - Create Project and Start Generation', () => {
  afterEach(() => {
    mock.reset()
  })

  it('should create project and start generation', async () => {
    // Step 1: Create project
    mock.onPost('/projects').reply(201, {
      id: 'proj-123',
      project_name: 'Test',
      status: 'INITIALIZED',
      content_text: '測試'.repeat(100),
      content_source: 'paste',
      created_at: '2025-10-19T10:00:00Z',
      updated_at: '2025-10-19T10:00:00Z',
    })

    const project = await projectsApi.createProject({
      projectName: 'Test',
      contentText: '測試'.repeat(100),
      contentSource: 'paste',
    })

    expect(project.id).toBe('proj-123')

    // Step 2: Update configuration
    mock.onPut('/projects/proj-123').reply(200, {
      ...project,
      visual_config: { subtitle: {} },
    })

    const updated = await projectsApi.updateProject('proj-123', {
      visual_config: { subtitle: {} } as any,
    })

    expect(updated.visual_config).toBeDefined()

    // Step 3: Start generation
    mock.onPost('/projects/proj-123/generate').reply(200, { success: true })

    await projectsApi.startGeneration('proj-123')

    // All requests should succeed
    expect(mock.history.post.length).toBe(2)
    expect(mock.history.put.length).toBe(1)
  })
})
