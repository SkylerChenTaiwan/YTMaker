import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/services/api'
import * as configurationsApi from '@/services/configurationsApi'

const mock = new MockAdapter(apiClient)

describe('Configurations API', () => {
  afterEach(() => {
    mock.reset()
  })

  describe('getVisualConfigs', () => {
    it('should get all visual configs', async () => {
      const mockConfigs = [
        { subtitle: { font_family: 'Arial' } },
        { subtitle: { font_family: 'Helvetica' } },
      ]

      mock.onGet('/configurations/visual').reply(200, mockConfigs)

      const result = await configurationsApi.getVisualConfigs()

      expect(result).toHaveLength(2)
    })
  })

  describe('getPromptTemplates', () => {
    it('should get all prompt templates', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Template 1',
          content: 'Content 1',
          created_at: '2025-10-19',
          usage_count: 10,
        },
      ]

      mock.onGet('/configurations/prompts').reply(200, mockTemplates)

      const result = await configurationsApi.getPromptTemplates()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Template 1')
    })
  })

  describe('getVisualConfig', () => {
    it('should get single visual config', async () => {
      const mockConfig = { subtitle: { font_family: 'Arial' } }

      mock.onGet('/configurations/visual/1').reply(200, mockConfig)

      const result = await configurationsApi.getVisualConfig('1')

      expect(result).toBeDefined()
    })
  })

  describe('createVisualConfig', () => {
    it('should create visual config', async () => {
      const newConfig = { subtitle: { font_family: 'Arial' } }

      mock.onPost('/configurations/visual').reply(201, newConfig)

      const result = await configurationsApi.createVisualConfig(newConfig as any)

      expect(result).toBeDefined()
    })
  })

  describe('deleteVisualConfig', () => {
    it('should delete visual config', async () => {
      mock.onDelete('/configurations/visual/1').reply(204)

      await configurationsApi.deleteVisualConfig('1')

      expect(mock.history.delete.length).toBe(1)
    })
  })

  describe('createPromptTemplate', () => {
    it('should create prompt template', async () => {
      const newTemplate = {
        name: 'New Template',
        content: 'New Content',
      }

      mock.onPost('/configurations/prompts').reply(201, {
        ...newTemplate,
        id: '2',
        created_at: '2025-10-19',
        usage_count: 0,
      })

      const result = await configurationsApi.createPromptTemplate(newTemplate)

      expect(result.name).toBe('New Template')
    })
  })
})
