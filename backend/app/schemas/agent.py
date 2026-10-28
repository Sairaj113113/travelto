from pydantic import BaseModel
class AgentRequest(BaseModel):
    message: str
    trip_id: str | None = None
