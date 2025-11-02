from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os

from recommender import recommend_applicants

app = FastAPI(title="HackMate Recommender")

class ApplicantIn(BaseModel):
    id: str
    name: Optional[str]
    email: Optional[str]
    github: Optional[str]
    linkedin: Optional[str]
    resume: Optional[str]
    skills: Optional[List[str]] = []

class TeamIn(BaseModel):
    id: str
    teamName: Optional[str]
    hackathonName: Optional[str]
    regURL: Optional[str]
    skills: Optional[List[str]] = []
    role: Optional[str] = None
    experience: Optional[str] = None
    description: Optional[str] = None

class RecommendRequest(BaseModel):
    team: TeamIn
    applicants: List[ApplicantIn]
    top_n: Optional[int] = 5

@app.post("/recommend")
async def recommend(req: RecommendRequest):
    try:
        github_token = os.environ.get('GITHUB_TOKEN')
        recs = recommend_applicants(req.team.dict(), [a.dict() for a in req.applicants], top_n=req.top_n or 5, github_token=github_token)
        return {"recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)
