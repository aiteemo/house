import hashlib
import random
import time
import urllib.parse
import requests

SECRET = '$d6eb7ff91ee257475%'
HEADERS = {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36'}
CHARSET = list('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
BASE = 'https://tousu.sina.com.cn/api'

CATEGORY_RULES = [
    ('增项问题', ['增项']),
    ('工期延期', ['延期', '逾期未发货', '延期发货', '超时限未履约']),
    ('产品质量', ['产品质量问题', '甲醛超标', '质量差', '货不对板', '三无产品', '产品质量']),
    ('退款纠纷', ['退款问题', '不予退款', '退费']),
    ('虚假宣传', ['虚假宣传', '广告促销误导消费', '诱导消费']),
    ('服务态度', ['态度恶劣']),
    ('服务欺诈', ['服务欺诈', '欺诈']),
    ('售后服务', ['售后服务', '售后服务质量', '售后不及时', '服务不到位', '客服不处理', '客服态度差', '服务效率']),
    ('价格收费', ['收费问题', '价格问题', '乱收费']),
    ('合同纠纷', ['合同不规范', '霸王条款']),
    ('赔偿问题', ['赔偿问题']),
    ('合作商户', ['合作商户不诚信']),
    ('其他', ['威胁恐吓', '电话骚扰', '设计错误', '优惠券问题', '不发货']),
]

TITLE_HINTS = [
    ('增项问题', ['增项']),
    ('工期延期', ['延期', '拖延', '超期', '未按时', '逾期', '延迟']),
    ('产品质量', ['质量', '发霉', '开裂', '破损', '甲醛', '异味', '色差', '变形', '生锈', '尺寸']),
    ('服务态度', ['态度恶劣', '态度差', '推诿', '踢皮球', '挂电话']),
    ('退款纠纷', ['退款', '退费', '退定金', '不退']),
]


def classify(issue_str, title='', summary=''):
    tags = [t.strip() for t in issue_str.split(',') if t.strip()]
    text = title + summary

    if '增项' in text:
        return '增项问题'

    for category, keywords in CATEGORY_RULES:
        if any(k in tag for tag in tags for k in keywords):
            return category

    for cat, hints in TITLE_HINTS:
        if any(h in text for h in hints):
            return cat

    return '其他'


def generate_signature(couid, page=1):
    ts = str(int(time.time() * 1000))
    rs = ''.join(random.choice(CHARSET) for _ in range(16))
    signature = ''.join(sorted([ts, rs, SECRET, couid, '1', '10', str(page)]))
    signature = hashlib.sha256(signature.encode('utf-8')).hexdigest()
    return ts, rs, signature


def fetch_complaints(couid, page=1):
    ts, rs, signature = generate_signature(couid, page)
    url = (
        f'{BASE}/company/received_complaints'
        f'?ts={ts}&rs={rs}&signature={signature}'
        f'&type=1&page_size=10&page={page}&couid={couid}'
    )
    return requests.get(url, headers=HEADERS).json()


def fetch_company_info(couid):
    url = f'{BASE}/company/info?couid={couid}'
    return requests.get(url, headers=HEADERS).json().get('result', {}).get('data', {})


def parse_url(url_or_couid):
    if 'couid=' in url_or_couid:
        params = urllib.parse.parse_qs(urllib.parse.urlparse(url_or_couid).query)
        return params['couid'][0]
    return url_or_couid


def fetch_all(couid, delay=10, start_page=1):
    info = fetch_company_info(couid)
    page = start_page
    all_complaints = []

    while True:
        result = fetch_complaints(couid, page)
        complaints = result.get('result', {}).get('data', {}).get('complaints', [])
        if not complaints:
            break
        all_complaints.extend(complaints)
        pager = result.get('result', {}).get('data', {}).get('pager', {})
        next_page = pager.get('next')
        if not next_page:
            break
        page = next_page
        time.sleep(delay)

    return info, all_complaints
