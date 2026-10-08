# 숲속 원정대: 고블린 굴 (플레이어블 데모)
모바일로 구동하는 추억의 나랜디 개발. 친구와 놀이용. 수익목적 아님

## 실행
`dist/forest_expedition.html` 하나만 브라우저(모바일 가로 권장)로 열면 됩니다. 외부 라이브러리·에셋 없음.

## 개발
```
node tools/build.js            # src/ → dist/forest_expedition.html (단일 파일)
node tools/check_logic.cjs     # 지도 생성 제약(1000시드) + 시드 결정성
node tools/balance.cjs [--ult] # 헤드리스 전투 밸런스 표
node tools/e2e.mjs [outDir]    # Playwright: 버튼 전체, 5스테이지 완주, 전멸, 모바일 해상도
```
구조와 설계는 `docs/PLAN.md`. 모든 수치/데이터는 `src/js/01_data.js` 테이블에 있습니다.
