import {
  siJenkins,
  siGithubactions,
  siGitlab,
  siArgo,
  siCircleci,
  siMysql,
  siPostgresql,
  siMongodb,
  siRedis,
  siElasticsearch,
  siApachecassandra,
  siSpring,
  siSpringboot,
  siReact,
  siVuedotjs,
  siAngular,
  siDjango,
  siFastapi,
  siExpress,
  siNextdotjs,
  siApachekafka,
  siRabbitmq,
  siNatsdotio,
  siNginx,
  siDocker,
  siKubernetes,
  siIstio,
  siTerraform,
  siGooglecloud,
  siGrafana,
  siPrometheus,
  siDatadog,
  siSentry,
  siJaeger,
  siElastic,
  siKeycloak,
  siAuth0,
  siOkta,
  siMinio,
  siCeph,
  siGithub,
  siJira,
} from 'simple-icons'

interface SimpleIcon {
  title: string
  slug: string
  hex: string
  svg: string
}

// 카탈로그 type → simple-icon. 명시 import 로 트리쉐이크 가능하게 작성.
// 매핑이 비어 있는 항목(AWS/Azure/Slack 등, simple-icons 가 트레이드마크 사유로 제거)은
// 컬러 배지 + 이니셜 폴백으로 자동 렌더된다.
const ICONS: Record<string, SimpleIcon | undefined> = {
  jenkins: siJenkins,
  'github-actions': siGithubactions,
  'gitlab-ci': siGitlab,
  argocd: siArgo,
  circleci: siCircleci,

  mysql: siMysql,
  postgresql: siPostgresql,
  mongodb: siMongodb,
  redis: siRedis,
  elasticsearch: siElasticsearch,
  cassandra: siApachecassandra,

  'spring-web': siSpring,
  'spring-boot': siSpringboot,
  react: siReact,
  vue: siVuedotjs,
  angular: siAngular,
  django: siDjango,
  fastapi: siFastapi,
  express: siExpress,
  nextjs: siNextdotjs,

  kafka: siApachekafka,
  rabbitmq: siRabbitmq,
  nats: siNatsdotio,

  nginx: siNginx,
  docker: siDocker,
  kubernetes: siKubernetes,
  istio: siIstio,
  terraform: siTerraform,

  'gcp-cloud-run': siGooglecloud,

  grafana: siGrafana,
  prometheus: siPrometheus,
  datadog: siDatadog,
  sentry: siSentry,
  jaeger: siJaeger,
  elk: siElastic,

  keycloak: siKeycloak,
  auth0: siAuth0,
  okta: siOkta,

  minio: siMinio,
  ceph: siCeph,

  github: siGithub,
  gitlab: siGitlab,
  jira: siJira,
}

const dataUrlCache = new Map<string, string>()

export function iconHex(type: string): string | null {
  const icon = ICONS[type]
  return icon ? `#${icon.hex}` : null
}

export function iconDataUrl(type: string): string | null {
  const cached = dataUrlCache.get(type)
  if (cached !== undefined) return cached || null
  const icon = ICONS[type]
  if (!icon) {
    dataUrlCache.set(type, '')
    return null
  }
  const colored = icon.svg.replace(/<svg([^>]+)>/, `<svg$1 fill="#${icon.hex}">`)
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(colored)}`
  dataUrlCache.set(type, url)
  return url
}

export function hasIcon(type: string): boolean {
  return !!ICONS[type]
}
