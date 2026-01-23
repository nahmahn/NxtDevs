import requests
import json

def fetch_leetcode_data(username):
    url = "https://leetcode.com/graphql"
    
    # Query for basic profile and problem stats
    query_profile = """
    query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                realName
                userAvatar
                ranking
            }
            submitStats {
                acSubmissionNum {
                    difficulty
                    count
                    submissions
                }
            }
            tagProblemCounts {
                advanced {
                    tagName
                    tagSlug
                    problemsSolved
                }
                intermediate {
                    tagName
                    tagSlug
                    problemsSolved
                }
                fundamental {
                    tagName
                    tagSlug
                    problemsSolved
                }
            }
        }
    }
    """
    
    # Query for recent submissions
    query_recent = """
    query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
        }
    }
    """
    
    headers = {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    print(f"Fetching data for {username}...")
    
    # Fetch Profile & Stats
    response_profile = requests.post(url, json={'query': query_profile, 'variables': {'username': username}}, headers=headers)
    if response_profile.status_code == 200:
        print("\n--- Profile Data ---")
        try:
            data = response_profile.json()
            if 'errors' in data:
                print("Errors:", data['errors'])
            else:
                user = data.get('data', {}).get('matchedUser')
                if user:
                    print(f"Username: {user['username']}")
                    print(f"Real Name: {user['profile']['realName']}")
                    print(f"Ranking: {user['profile']['ranking']}")
                    print("Stats:", json.dumps(user['submitStats'], indent=2))
                    print("Tags (First 3 Advanced):", json.dumps(user['tagProblemCounts']['advanced'][:3], indent=2))
                else:
                    print("User not found or no data.")
        except Exception as e:
            print("Error parsing profile JSON:", e)
    else:
        print(f"Failed to fetch profile: {response_profile.status_code}")

    # Fetch Recent Submissions
    response_recent = requests.post(url, json={'query': query_recent, 'variables': {'username': username, 'limit': 5}}, headers=headers)
    if response_recent.status_code == 200:
        print("\n--- Recent Submissions ---")
        try:
            data = response_recent.json()
            submissions = data.get('data', {}).get('recentAcSubmissionList', [])
            for sub in submissions:
                print(f"- {sub['title']} ({sub['timestamp']})")
        except Exception as e:
            print("Error parsing recent JSON:", e)
    else:
        print(f"Failed to fetch recent: {response_recent.status_code}")

if __name__ == "__main__":
    fetch_leetcode_data("neal_wu")
