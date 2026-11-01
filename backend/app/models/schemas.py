from enum import Enum
from pydantic import BaseModel, Field, field_validator

class Category(str, Enum):
    PERSON="PERSON"; PLACE="PLACE"; EVENT="EVENT"; FOOD_OR_RECIPE="FOOD_OR_RECIPE"; TRADITION="TRADITION"
    OBJECT="OBJECT"; SAYING_OR_EXPRESSION="SAYING_OR_EXPRESSION"; SONG_OR_MUSIC_REFERENCE="SONG_OR_MUSIC_REFERENCE"
    FAMILY_HISTORY="FAMILY_HISTORY"; LIFE_LESSON="LIFE_LESSON"; OTHER="OTHER"

class Evidence(BaseModel):
    segment_id: str
    exact_quote: str
    start_seconds: float | None = None
    end_seconds: float | None = None

class MemoryCandidate(BaseModel):
    category: Category
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(max_length=800)
    evidence: list[Evidence] = Field(default_factory=list)
    confidence: float = 0.5
    uncertain: bool = False
    @field_validator("confidence")
    @classmethod
    def clamp(cls, v): return max(0.0, min(1.0, v))

class ExtractionResult(BaseModel):
    memories: list[MemoryCandidate]

class AnswerResult(BaseModel):
    answer: str
    used_segment_ids: list[str]

class VaultCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    passphrase: str = Field(min_length=12)
class VaultUnlock(BaseModel): passphrase: str
class TranscriptSegmentIn(BaseModel):
    id: str; text: str; speaker: str | None = None; redacted: bool = False
class TranscriptIn(BaseModel): segments: list[TranscriptSegmentIn]
class SearchIn(BaseModel): query: str = Field(min_length=1, max_length=500); limit: int = 8
class CollectionIn(BaseModel): name: str = Field(min_length=1, max_length=100); memory_ids: list[str] = []; note: str = ""
class ExportIn(BaseModel): confirm_plaintext: bool = False; collection_id: str | None = None; story_id: str | None = None
