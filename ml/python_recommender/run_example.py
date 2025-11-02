from recommender import recommend_applicants
import os

if __name__ == '__main__':
    team = {
        'id': 'team-1',
        'teamName': 'Awesome Team',
        'skills': ['React', 'TypeScript', 'Tailwind'],
        'description': 'Looking for frontend dev with React and TypeScript and some CSS utility framework experience.'
    }

    applicants = [
        {
            'id': 'u1',
            'name': 'Dev A',
            'email': 'a@example.com',
            'github': 'https://github.com/octocat',
            'linkedin': '',
            'resume': '',
            'skills': ['React', 'TypeScript']
        },
        {
            'id': 'u2',
            'name': 'Dev B',
            'email': 'b@example.com',
            'github': '',
            'linkedin': '',
            'resume': '',
            'skills': ['Python', 'Flask']
        }
    ]

    recs = recommend_applicants(team, applicants, top_n=5, github_token=os.environ.get('GITHUB_TOKEN'))
    for r in recs:
        print(f"{r['applicant']['name']} -> score={r['score']:.3f} breakdown={r['breakdown']}")
