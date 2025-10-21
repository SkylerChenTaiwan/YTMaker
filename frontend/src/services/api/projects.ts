import { axiosInstance } from './axios'

export interface GetProjectsParams {
  limit?: number
  offset?: number
  status?: string
  sort_by?: string
  order?: 'asc' | 'desc'
}

export interface Project {
  id: string
  project_name: string
  status: 'INITIALIZED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  created_at: string
  updated_at: string
  youtube_video_id?: string
}

export interface GetProjectsResponse {
  projects: Project[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export interface CreateProjectRequest {
  project_name: string
  content_text: string
  content_source: 'paste' | 'upload'
}

export const projectsApi = {
  async getProjects(params: GetProjectsParams = {}): Promise<GetProjectsResponse> {
    const { data } = await axiosInstance.get('/api/v1/projects', { params })
    return data.data
  },

  async getProject(projectId: string): Promise<Project> {
    const { data } = await axiosInstance.get(`/api/v1/projects/${projectId}`)
    return data.data
  },

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const { data } = await axiosInstance.post('/api/v1/projects', request)
    return data.data
  },

  async deleteProject(projectId: string): Promise<void> {
    await axiosInstance.delete(`/api/v1/projects/${projectId}`)
  },
}
