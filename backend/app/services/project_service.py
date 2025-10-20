# Placeholder service for projects
class ProjectService:
    def __init__(self, db):
        self.db = db
    
    def list_projects(self, query):
        return {"success": True, "data": {"projects": []}}
    
    def create_project(self, data):
        return {"success": True}
    
    def get_project(self, project_id):
        return {"success": True}
    
    def delete_project(self, project_id, delete_files=True):
        pass
    
    def update_configuration(self, project_id, data):
        pass
    
    def update_prompt_model(self, project_id, data):
        pass
    
    def update_youtube_settings(self, project_id, data):
        pass
    
    def start_generation(self, project_id):
        return {"success": True}
    
    def cancel_generation(self, project_id):
        pass
    
    def pause_generation(self, project_id):
        pass
    
    def resume_generation(self, project_id):
        return {"success": True}
    
    def get_result(self, project_id):
        return {"success": True}
