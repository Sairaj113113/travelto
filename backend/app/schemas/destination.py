from pydantic import BaseModel


class DestinationCreate(BaseModel):
    name: str
    city: str
    state: str
    category: str
    description: str
    image_url: str | None = None


class DestinationResponse(BaseModel):
    id: int
    name: str
    city: str
    state: str
    category: str
    description: str
    image_url: str | None = None

    class Config:
        from_attributes = True