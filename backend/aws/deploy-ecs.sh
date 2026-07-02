#!/usr/bin/env bash
# Deploy cheungprey-api to ECS Fargate (ap-southeast-1)
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-476021469163}"
IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/cheungprey-api:latest"

cd "$(dirname "$0")/.."

echo "==> Build and push Docker image (ARM64 for Apple Silicon; use --platform linux/amd64 for x86 Fargate)"
docker build -t cheungprey-api .
docker tag cheungprey-api:latest "$IMAGE"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
docker push "$IMAGE"

echo "==> Register task definition"
python3 << 'PY'
import json
from pathlib import Path

def load_env(path):
    env = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        line = line.strip().strip('\r')
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()
    return env

env = load_env('.env')
tpl = json.loads(Path('aws/ecs-task-definition.json').read_text())
values = {
    'PORT': env.get('PORT', '8080'),
    'SUPABASE_URL': env['SUPABASE_URL'],
    'SUPABASE_PUBLISHABLE_KEY': env['SUPABASE_PUBLISHABLE_KEY'],
    'SUPABASE_SECRET_KEY': env['SUPABASE_SECRET_KEY'],
    'SUPABASE_JWKS_URL': env['SUPABASE_JWKS_URL'],
    'CORS_ORIGIN': env.get('CORS_ORIGIN', 'https://cheung-prey-system.onrender.com,https://cheungprey-system.onrender.com,http://localhost:5173'),
    'CHROME_PATH': '/usr/bin/chromium',
}
for item in tpl['containerDefinitions'][0]['environment']:
    if item['name'] in values:
        item['value'] = values[item['name']]
Path('/tmp/cheungprey-task-def.json').write_text(json.dumps(tpl))
PY
aws ecs register-task-definition --cli-input-json file:///tmp/cheungprey-task-def.json --region "$AWS_REGION" >/dev/null

echo "==> Force new ECS deployment"
aws ecs update-service --cluster cheungprey --service cheungprey-api --task-definition cheungprey-api --force-new-deployment --region "$AWS_REGION" >/dev/null

echo "Done. Get public IP:"
echo "  aws ecs list-tasks --cluster cheungprey --service-name cheungprey-api --desired-status RUNNING --region $AWS_REGION"
