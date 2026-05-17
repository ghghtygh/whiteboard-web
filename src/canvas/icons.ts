// devicon (컬러 원본 로고) 우선 → simple-icons (단색) → 컬러 배지 폴백.
// devicon 은 SVG 파일 자체를 가져와 ?url 로 자산 참조. simple-icons 는 인라인 SVG 문자열.

// ---------- devicon (color original) ----------
import devJenkins from 'devicon/icons/jenkins/jenkins-original.svg?url'
import devGithubActions from 'devicon/icons/githubactions/githubactions-original.svg?url'
import devGitlab from 'devicon/icons/gitlab/gitlab-original.svg?url'
import devArgocd from 'devicon/icons/argocd/argocd-original.svg?url'
import devMysql from 'devicon/icons/mysql/mysql-original.svg?url'
import devPostgresql from 'devicon/icons/postgresql/postgresql-original.svg?url'
import devMongodb from 'devicon/icons/mongodb/mongodb-original.svg?url'
import devRedis from 'devicon/icons/redis/redis-original.svg?url'
import devElasticsearch from 'devicon/icons/elasticsearch/elasticsearch-original.svg?url'
import devCassandra from 'devicon/icons/cassandra/cassandra-original.svg?url'
import devSpring from 'devicon/icons/spring/spring-original.svg?url'
import devReact from 'devicon/icons/react/react-original.svg?url'
import devVue from 'devicon/icons/vuejs/vuejs-original.svg?url'
import devAngular from 'devicon/icons/angular/angular-original.svg?url'
import devFastapi from 'devicon/icons/fastapi/fastapi-original.svg?url'
import devExpress from 'devicon/icons/express/express-original.svg?url'
import devNextjs from 'devicon/icons/nextjs/nextjs-original.svg?url'
import devKafka from 'devicon/icons/apachekafka/apachekafka-original.svg?url'
import devRabbitmq from 'devicon/icons/rabbitmq/rabbitmq-original.svg?url'
import devNats from 'devicon/icons/nats/nats-original.svg?url'
import devNginx from 'devicon/icons/nginx/nginx-original.svg?url'
import devDocker from 'devicon/icons/docker/docker-original.svg?url'
import devKubernetes from 'devicon/icons/kubernetes/kubernetes-original.svg?url'
import devTerraform from 'devicon/icons/terraform/terraform-original.svg?url'
import devAws from 'devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg?url'
import devGoogleCloud from 'devicon/icons/googlecloud/googlecloud-original.svg?url'
import devAzure from 'devicon/icons/azure/azure-original.svg?url'
import devGrafana from 'devicon/icons/grafana/grafana-original.svg?url'
import devPrometheus from 'devicon/icons/prometheus/prometheus-original.svg?url'
import devDatadog from 'devicon/icons/datadog/datadog-original.svg?url'
import devSentry from 'devicon/icons/sentry/sentry-original.svg?url'
import devOkta from 'devicon/icons/okta/okta-original.svg?url'
import devSlack from 'devicon/icons/slack/slack-original.svg?url'
import devJira from 'devicon/icons/jira/jira-original.svg?url'
import devGithub from 'devicon/icons/github/github-original.svg?url'

// ---------- simple-icons (devicon 에 없거나 'plain' 만 있는 항목 보강) ----------
import {
  siCircleci,
  siDjango,
  siIstio,
  siJaeger,
  siElastic,
  siKeycloak,
  siAuth0,
  siMinio,
  siCeph,
} from 'simple-icons'

interface SimpleIcon {
  title: string
  slug: string
  hex: string
  svg: string
}

const SIMPLE: Record<string, SimpleIcon | undefined> = {
  circleci: siCircleci,
  django: siDjango,
  istio: siIstio,
  jaeger: siJaeger,
  elk: siElastic,
  keycloak: siKeycloak,
  auth0: siAuth0,
  minio: siMinio,
  ceph: siCeph,
}

// 카탈로그 type → devicon SVG URL (1순위)
const DEV_URLS: Record<string, string> = {
  jenkins: devJenkins,
  'github-actions': devGithubActions,
  'gitlab-ci': devGitlab,
  argocd: devArgocd,
  mysql: devMysql,
  postgresql: devPostgresql,
  mongodb: devMongodb,
  redis: devRedis,
  elasticsearch: devElasticsearch,
  cassandra: devCassandra,
  'spring-web': devSpring,
  'spring-boot': devSpring,
  react: devReact,
  vue: devVue,
  angular: devAngular,
  fastapi: devFastapi,
  express: devExpress,
  nextjs: devNextjs,
  kafka: devKafka,
  rabbitmq: devRabbitmq,
  nats: devNats,
  nginx: devNginx,
  docker: devDocker,
  kubernetes: devKubernetes,
  terraform: devTerraform,
  // AWS — devicon 은 통합 로고만 있어서 EC2/S3/Lambda/RDS/SQS/Kinesis/DynamoDB 모두 같은 AWS 마크를 사용.
  // 서비스별 식별은 라벨/색상 배지 보완 필요.
  'aws-ec2': devAws,
  'aws-s3': devAws,
  'aws-lambda': devAws,
  'aws-rds': devAws,
  sqs: devAws,
  kinesis: devAws,
  dynamodb: devAws,
  'gcp-cloud-run': devGoogleCloud,
  'azure-functions': devAzure,
  grafana: devGrafana,
  prometheus: devPrometheus,
  datadog: devDatadog,
  sentry: devSentry,
  okta: devOkta,
  slack: devSlack,
  jira: devJira,
  github: devGithub,
  gitlab: devGitlab,
}

const dataUrlCache = new Map<string, string>()

function simpleIconDataUrl(icon: SimpleIcon): string {
  const colored = icon.svg.replace(/<svg([^>]+)>/, `<svg$1 fill="#${icon.hex}">`)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(colored)}`
}

export function iconUrl(type: string): string | null {
  const cached = dataUrlCache.get(type)
  if (cached !== undefined) return cached || null
  // 1순위: devicon URL (이미 string 형태의 정적 자산 경로)
  const dev = DEV_URLS[type]
  if (dev) {
    dataUrlCache.set(type, dev)
    return dev
  }
  // 2순위: simple-icons SVG → data URL
  const si = SIMPLE[type]
  if (si) {
    const url = simpleIconDataUrl(si)
    dataUrlCache.set(type, url)
    return url
  }
  dataUrlCache.set(type, '')
  return null
}

export function iconHex(type: string): string | null {
  const si = SIMPLE[type]
  return si ? `#${si.hex}` : null
}

export function hasIcon(type: string): boolean {
  return !!DEV_URLS[type] || !!SIMPLE[type]
}

// 기존 API 호환 (NodeShape / Sidebar 가 iconDataUrl 을 사용)
export const iconDataUrl = iconUrl
