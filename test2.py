import requests

cookies = {
    'k8s': '1779625193.084.18542.325621',
    'route': '6c7e83002ce2cc0e78a680d806381539',
    'source': '""',
    'fid': '23468',
    '_uid': '291663256',
    '_d': '1779769472474',
    'UID': '291663256',
    'vc3': 'S2Xgil0QEu1xd%2FO4QsEGkOUzympbgBnyquGKw8IZ4QaIDCMSrFS5zWjOENOfSB3DIb0u1kiQCMXyndYB86pCybW42SVDLudTCUckWIzy%2Fr4h2R2AdHkvUDlIi3VB%2BZc%2FlbYixekBu8di98By7U57gBDeUBJpRxB559sDBuvwn2A%3D00ee5650b20bd2ee205459e9e836c546',
    'uf': 'da0883eb5260151e917f101bc58dbbbab4fdc2911b77d46f0c13433b2c08800be2c55e8ff3c014e65c0543f979fa345ab7f7d292066fbd0bc49d67c0c30ca5043ad701c8b4cc548c0234d89f51c3dccfbc85c12642ab28bee5851b744f8aa02c9fb3947ed09a594c37a65a2aa9989edf93c138f445919c8791aa757d93c69a49570d926ceb0eeff40327309fd0cfd3e470b5a05e402d2a6370184964ffe8c27c7d91c9a0e88c121f7f058e903953daeeb1f899d50c1c3fa3aa2ebad65cd196bb',
    'cx_p_token': '447aa9d58c023f779e3e6f42eba972a3',
    'p_auth_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIyOTE2NjMyNTYiLCJsb2dpblRpbWUiOjE3Nzk3Njk0NzI0NzUsImV4cCI6MTc4MDM3NDI3Mn0.ZZdE8zOTN8TaYwLyYEyZgM0xpr_CENLUShvxCGfditk',
    'xxtenc': '48e97d6b67e4088d6938263b6b26a1d7',
    'DSSTASH_LOG': 'C_38-UN_61-US_291663256-T_1779769472476',
    'spaceFid': '23468',
    'spaceRoleId': '""',
    'jrose': 'BC5F2B8D5AA7273BF2F68181ED51C1D4.mooc-p4-2936861807-hfhjk',
}

headers = {
    'Accept': '*/*',
    'Referer': 'https://mooc1.chaoxing.com/mycourse/studentstudy?chapterId=832054531&courseId=102261532&clazzid=139661784&cpi=336467063',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    # 'Cookie': 'k8s=1779625193.084.18542.325621; route=6c7e83002ce2cc0e78a680d806381539; source=""; fid=23468; _uid=291663256; _d=1779769472474; UID=291663256; vc3=S2Xgil0QEu1xd%2FO4QsEGkOUzympbgBnyquGKw8IZ4QaIDCMSrFS5zWjOENOfSB3DIb0u1kiQCMXyndYB86pCybW42SVDLudTCUckWIzy%2Fr4h2R2AdHkvUDlIi3VB%2BZc%2FlbYixekBu8di98By7U57gBDeUBJpRxB559sDBuvwn2A%3D00ee5650b20bd2ee205459e9e836c546; uf=da0883eb5260151e917f101bc58dbbbab4fdc2911b77d46f0c13433b2c08800be2c55e8ff3c014e65c0543f979fa345ab7f7d292066fbd0bc49d67c0c30ca5043ad701c8b4cc548c0234d89f51c3dccfbc85c12642ab28bee5851b744f8aa02c9fb3947ed09a594c37a65a2aa9989edf93c138f445919c8791aa757d93c69a49570d926ceb0eeff40327309fd0cfd3e470b5a05e402d2a6370184964ffe8c27c7d91c9a0e88c121f7f058e903953daeeb1f899d50c1c3fa3aa2ebad65cd196bb; cx_p_token=447aa9d58c023f779e3e6f42eba972a3; p_auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIyOTE2NjMyNTYiLCJsb2dpblRpbWUiOjE3Nzk3Njk0NzI0NzUsImV4cCI6MTc4MDM3NDI3Mn0.ZZdE8zOTN8TaYwLyYEyZgM0xpr_CENLUShvxCGfditk; xxtenc=48e97d6b67e4088d6938263b6b26a1d7; DSSTASH_LOG=C_38-UN_61-US_291663256-T_1779769472476; spaceFid=23468; spaceRoleId=""; jrose=BC5F2B8D5AA7273BF2F68181ED51C1D4.mooc-p4-2936861807-hfhjk',
}

params = {
    'clazzid': '139661784',
    'courseid': '102261532',
    'knowledgeid': '832054531',
    'cpi': '336467063'
}

response = requests.get('https://mooc1.chaoxing.com/mooc-ans/knowledge/cards', params=params, cookies=cookies, headers=headers)
print(response.text)