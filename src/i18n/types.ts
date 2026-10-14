import type en from '@/i18n/locales/en'

type Source = typeof en

// en 의 리터럴 타입을 string 으로 넓힌 "모양" — 다른 로케일 파일은 이 타입을 만족해야 한다.
// 키가 빠지거나(누락) 남거나(오타/삭제된 키) 하면 컴파일 에러.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<Source>

// 'auth.login.title' 같은 점 경로 키의 유니온.
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]
export type MessageKey = Paths<Source>

type Lookup<T, K extends string> = K extends `${infer H}.${infer R}`
  ? H extends keyof T
    ? Lookup<T[H], R>
    : never
  : K extends keyof T
    ? T[K]
    : never

// 'Deleted “{title}”' → 'title'
type ParamNames<S> = S extends `${string}{${infer P}}${infer Rest}` ? P | ParamNames<Rest> : never

export type MessageParams<K extends MessageKey> = Record<ParamNames<Lookup<Source, K>>, string | number>

/** 자리표시자가 없는 키는 인자 없이, 있는 키는 params 를 반드시 받도록 강제한다. */
export type TArgs<K extends MessageKey> = [ParamNames<Lookup<Source, K>>] extends [never]
  ? []
  : [params: MessageParams<K>]

export type TFunction = <K extends MessageKey>(key: K, ...args: TArgs<K>) => string
