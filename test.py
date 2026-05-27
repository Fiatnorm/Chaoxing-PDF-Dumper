import json
import requests
import time

cookies = {
    'k8s-ed': '1779616777.59.17949.853956',
    'jrose': 'F95F0C4D03205CEAF472C444FA877024.html-editor-a-2566616441-48b02',
    'fid': '23468',
    '_uid': '291663256',
    '_d': '1779152617555',
    'UID': '291663256',
    'vc3': 'K%2FSmsEbMLpYvj6oQeJGXcjd3hFOLNmj4qU7AmJY6R2xU%2B5yp%2FOLLUJaeDB%2FAyRqtxxyJjHjuqSv3i%2B%2FHIyVi%2Fg7wHbi474Sxr71Dun22UJ561F822QJg1RTYWSLeq0FxDYto%2Bx63BK1o1bV66sWa2qhgPxtp0Rk%2BHFbe069yPyo%3D54e425f5f4fcb09a3c5fabb36b1dd34c',
    'uf': 'da0883eb5260151e917f101bc58dbbbab4fdc2911b77d46f0c13433b2c08800be2c55e8ff3c014e6ac4fef472a5b969923ba1e07b5fbf436c49d67c0c30ca5043ad701c8b4cc548c0234d89f51c3dccfbc85c12642ab28bee5851b744f8aa02c9fb3947ed09a594cd86c4ee3d83ba70b663015f3cd9b1053c5859b0a942466138a8fdcb91eacf3352e12280624dcaf0a70b5a05e402d2a6370184964ffe8c27c5b9802d245a74825759b9de13c78ddc6b1f899d50c1c3fa3aa2ebad65cd196bb',
    'cx_p_token': '08fc5dd80c9f9bc69eeb7758021833fd',
    'p_auth_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIyOTE2NjMyNTYiLCJsb2dpblRpbWUiOjE3NzkxNTI2MTc1NTcsImV4cCI6MTc3OTc1NzQxN30.hkdZQPDndFxgm9hQCBQT4l7xCMrT4ifGt721dYIqkIs',
    'xxtenc': '48e97d6b67e4088d6938263b6b26a1d7',
    'DSSTASH_LOG': 'C_38-UN_61-US_291663256-T_1779152617557',
    'source': '""',
    'spaceFid': '23468',
    'spaceRoleId': '""',
    '_industry': '5',
    '260609370cpi': '336467063',
    '260609370ut': 's',
    '260609370t': '1779615918304',
    '260609370enc': '5e41597e1aa1b67f6df8daccf8780d51',
    'k8s': '1779616102.695.94.947449',
    'route': '0eb899bb9bb390391b050e8cb1d78cb4',
    'jrose': 'AFE5E77232FB6EEEE200EB6E979A88A2.mooc-296350551-l02bm',
}

headers = {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Connection': 'keep-alive',
    'Referer': 'https://mooc1.chaoxing.com/ananas/modules/pdf/index.html?v=2026-0312-1153',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'dnt': '1',
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-gpc': '1',
    # 'Cookie': 'k8s-ed=1779616777.59.17949.853956; jrose=F95F0C4D03205CEAF472C444FA877024.html-editor-a-2566616441-48b02; fid=23468; _uid=291663256; _d=1779152617555; UID=291663256; vc3=K%2FSmsEbMLpYvj6oQeJGXcjd3hFOLNmj4qU7AmJY6R2xU%2B5yp%2FOLLUJaeDB%2FAyRqtxxyJjHjuqSv3i%2B%2FHIyVi%2Fg7wHbi474Sxr71Dun22UJ561F822QJg1RTYWSLeq0FxDYto%2Bx63BK1o1bV66sWa2qhgPxtp0Rk%2BHFbe069yPyo%3D54e425f5f4fcb09a3c5fabb36b1dd34c; uf=da0883eb5260151e917f101bc58dbbbab4fdc2911b77d46f0c13433b2c08800be2c55e8ff3c014e6ac4fef472a5b969923ba1e07b5fbf436c49d67c0c30ca5043ad701c8b4cc548c0234d89f51c3dccfbc85c12642ab28bee5851b744f8aa02c9fb3947ed09a594cd86c4ee3d83ba70b663015f3cd9b1053c5859b0a942466138a8fdcb91eacf3352e12280624dcaf0a70b5a05e402d2a6370184964ffe8c27c5b9802d245a74825759b9de13c78ddc6b1f899d50c1c3fa3aa2ebad65cd196bb; cx_p_token=08fc5dd80c9f9bc69eeb7758021833fd; p_auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIyOTE2NjMyNTYiLCJsb2dpblRpbWUiOjE3NzkxNTI2MTc1NTcsImV4cCI6MTc3OTc1NzQxN30.hkdZQPDndFxgm9hQCBQT4l7xCMrT4ifGt721dYIqkIs; xxtenc=48e97d6b67e4088d6938263b6b26a1d7; DSSTASH_LOG=C_38-UN_61-US_291663256-T_1779152617557; source=""; spaceFid=23468; spaceRoleId=""; _industry=5; 260609370cpi=336467063; 260609370ut=s; 260609370t=1779615918304; 260609370enc=5e41597e1aa1b67f6df8daccf8780d51; k8s=1779616102.695.94.947449; route=0eb899bb9bb390391b050e8cb1d78cb4; jrose=AFE5E77232FB6EEEE200EB6E979A88A2.mooc-296350551-l02bm',
}

params = {
    'flag': 'normal',
    '_dc': str(int(time.time() * 1000)),
}

response = requests.get(
    'https://mooc1.chaoxing.com/ananas/status/7164a2d7964e1e45db0a07b3c8df25b5',
    params=params,
    cookies=cookies,
    headers=headers,
)

try:
    result = response.json()
except ValueError:
    result = {
        'status_code': response.status_code,
        'url': response.url,
        'text': response.text,
    }

print(json.dumps(result, ensure_ascii=False, indent=2))
