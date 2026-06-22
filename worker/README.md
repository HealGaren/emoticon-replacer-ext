# Remote Config Worker

`emoticon-replacer-ext`의 런타임 설정(셀렉터·바인딩 전략·팝업·kill switch)을 재배포 없이 패치하기 위한 Cloudflare Worker + KV.

## 엔드포인트
- `GET /` — KV의 config JSON 반환 (ETag, `If-None-Match` → `304`). 확장이 이 URL을 폴링.
- `GET /admin` — 운영자 관리 패널(HTML). 주요 필드 폼 + raw JSON 편집.
- `PUT /` — `Authorization: Bearer <ADMIN_TOKEN>` 인증 후 KV에 config 저장.

## 최초 배포
```bash
cd worker
pnpm install            # 또는 npm install

# 1) KV 네임스페이스 생성 → 출력된 id를 wrangler.toml의 id에 기입
wrangler kv namespace create CONFIG_KV

# 2) 관리 토큰(임의의 긴 랜덤 문자열) 설정
wrangler secret put ADMIN_TOKEN

# 3) 배포
wrangler deploy
```

배포되면 `https://emoticon-replacer-config.<account>.workers.dev` 형태의 URL이 나온다.

## 확장과 연결
배포 URL을 확장의 `entrypoints/content/remote-config/loader.ts`의 `REMOTE_CONFIG_URL` 상수에 기입하고 확장을 재빌드한다. 이후로는 **확장 재빌드 없이** 관리 패널(`/admin`)에서 config만 바꾸면 다음 페이지 진입 시 반영된다.

## 운영
- 관리 패널: `https://<worker-url>/admin` 접속 → 관리 토큰 입력 → 값 수정 → **저장**.
- kill switch: `killSwitch.all`을 켜면 다음 페이지 진입부터 확장이 동작하지 않는다.
- KV가 비어 있으면 `src/index.ts`의 `DEFAULT_CONFIG`를 반환한다(확장 빌드 내장 기본값과 동일하게 유지할 것).

## 주의
- `ADMIN_TOKEN`은 반드시 secret으로 관리(평문 커밋 금지).
- ETag는 config 본문 SHA-256 해시라 내용이 바뀔 때만 변한다 → 변경 없으면 확장은 `304`로 본문을 받지 않는다.
