from pydantic import BaseModel
class BookingRequest(BaseModel):
    booking_type: str
    reference: str | None = None
