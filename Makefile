.PHONY: dev demo-server demo build

dev:
	cd app_build && bun run dev

demo-server:
	cd demo_server && bun index.ts

demo:
	$(MAKE) -j2 dev demo-server

build:
	cd app_build && bun run build
