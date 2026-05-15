import type { ComponentType, Anchor } from '@/types/domain'

const NOW = '2026-05-15T00:00:00Z'
const ANCHORS: Anchor[] = ['top', 'right', 'bottom', 'left']

// 스펙 §3.1 ComponentType + §11 1차 카탈로그 시드.
// 백엔드 도착 전 로컬 모드에서 사용. iconUrl 은 sidebar/canvas 에서 색상/이니셜 폴백 처리.
interface SeedEntry {
  type: string
  displayName: string
  category: string
  color: string
}

const SEED: SeedEntry[] = [
  // ci-cd
  { type: 'jenkins', displayName: 'Jenkins', category: 'ci-cd', color: '#d24939' },
  { type: 'github-actions', displayName: 'GitHub Actions', category: 'ci-cd', color: '#2088ff' },
  { type: 'gitlab-ci', displayName: 'GitLab CI', category: 'ci-cd', color: '#fc6d26' },
  { type: 'argocd', displayName: 'Argo CD', category: 'ci-cd', color: '#ef7b4d' },
  { type: 'circleci', displayName: 'CircleCI', category: 'ci-cd', color: '#343434' },

  // database
  { type: 'mysql', displayName: 'MySQL', category: 'database', color: '#00758f' },
  { type: 'postgresql', displayName: 'PostgreSQL', category: 'database', color: '#336791' },
  { type: 'mongodb', displayName: 'MongoDB', category: 'database', color: '#13aa52' },
  { type: 'redis', displayName: 'Redis', category: 'database', color: '#a41e11' },
  { type: 'elasticsearch', displayName: 'Elasticsearch', category: 'database', color: '#005571' },
  { type: 'dynamodb', displayName: 'DynamoDB', category: 'database', color: '#4053d6' },
  { type: 'cassandra', displayName: 'Cassandra', category: 'database', color: '#1287b1' },

  // framework
  { type: 'spring-web', displayName: 'Spring Web', category: 'framework', color: '#6db33f' },
  { type: 'spring-boot', displayName: 'Spring Boot', category: 'framework', color: '#6db33f' },
  { type: 'react', displayName: 'React', category: 'framework', color: '#61dafb' },
  { type: 'vue', displayName: 'Vue', category: 'framework', color: '#42b883' },
  { type: 'angular', displayName: 'Angular', category: 'framework', color: '#dd0031' },
  { type: 'django', displayName: 'Django', category: 'framework', color: '#092e20' },
  { type: 'fastapi', displayName: 'FastAPI', category: 'framework', color: '#009688' },
  { type: 'express', displayName: 'Express', category: 'framework', color: '#444444' },
  { type: 'nextjs', displayName: 'Next.js', category: 'framework', color: '#000000' },

  // messaging
  { type: 'kafka', displayName: 'Kafka', category: 'messaging', color: '#231f20' },
  { type: 'rabbitmq', displayName: 'RabbitMQ', category: 'messaging', color: '#ff6600' },
  { type: 'nats', displayName: 'NATS', category: 'messaging', color: '#27aae1' },
  { type: 'sqs', displayName: 'SQS', category: 'messaging', color: '#ff4f8b' },
  { type: 'kinesis', displayName: 'Kinesis', category: 'messaging', color: '#9d40ff' },

  // infrastructure
  { type: 'nginx', displayName: 'Nginx', category: 'infrastructure', color: '#009639' },
  { type: 'docker', displayName: 'Docker', category: 'infrastructure', color: '#2496ed' },
  { type: 'kubernetes', displayName: 'Kubernetes', category: 'infrastructure', color: '#326ce5' },
  { type: 'istio', displayName: 'Istio', category: 'infrastructure', color: '#466bb0' },
  { type: 'terraform', displayName: 'Terraform', category: 'infrastructure', color: '#7b42bc' },

  // cloud
  { type: 'aws-ec2', displayName: 'AWS EC2', category: 'cloud', color: '#ff9900' },
  { type: 'aws-s3', displayName: 'AWS S3', category: 'cloud', color: '#569a31' },
  { type: 'aws-lambda', displayName: 'AWS Lambda', category: 'cloud', color: '#ff9900' },
  { type: 'aws-rds', displayName: 'AWS RDS', category: 'cloud', color: '#3b48cc' },
  { type: 'gcp-cloud-run', displayName: 'GCP Cloud Run', category: 'cloud', color: '#4285f4' },
  { type: 'azure-functions', displayName: 'Azure Functions', category: 'cloud', color: '#0078d4' },

  // observability
  { type: 'grafana', displayName: 'Grafana', category: 'observability', color: '#f46800' },
  { type: 'prometheus', displayName: 'Prometheus', category: 'observability', color: '#e6522c' },
  { type: 'datadog', displayName: 'Datadog', category: 'observability', color: '#632ca6' },
  { type: 'sentry', displayName: 'Sentry', category: 'observability', color: '#362d59' },
  { type: 'jaeger', displayName: 'Jaeger', category: 'observability', color: '#66b3ff' },
  { type: 'elk', displayName: 'ELK', category: 'observability', color: '#005571' },

  // auth
  { type: 'keycloak', displayName: 'Keycloak', category: 'auth', color: '#4d4d4d' },
  { type: 'auth0', displayName: 'Auth0', category: 'auth', color: '#eb5424' },
  { type: 'okta', displayName: 'Okta', category: 'auth', color: '#007dc1' },

  // storage
  { type: 'minio', displayName: 'MinIO', category: 'storage', color: '#c72e29' },
  { type: 'ceph', displayName: 'Ceph', category: 'storage', color: '#ef5b25' },

  // etc
  { type: 'github', displayName: 'GitHub', category: 'etc', color: '#181717' },
  { type: 'gitlab', displayName: 'GitLab', category: 'etc', color: '#fc6d26' },
  { type: 'slack', displayName: 'Slack', category: 'etc', color: '#4a154b' },
  { type: 'jira', displayName: 'Jira', category: 'etc', color: '#0052cc' },
]

export const LOCAL_CATALOG: ComponentType[] = SEED.map((s) => ({
  type: s.type,
  displayName: s.displayName,
  category: s.category,
  iconUrl: `local://${s.type}`,
  defaultWidth: 80,
  defaultHeight: 80,
  anchors: ANCHORS,
  version: 1,
  deprecated: false,
  createdAt: NOW,
  updatedAt: NOW,
}))

export const LOCAL_CATALOG_COLOR: Record<string, string> = Object.fromEntries(
  SEED.map((s) => [s.type, s.color]),
)

export function catalogColor(type: string): string {
  return LOCAL_CATALOG_COLOR[type] ?? '#6b7280'
}
