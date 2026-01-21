# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-01-21

### Added

- Initial public release of LiteLLM middleware for Node.js
- Auto-initialization with zero configuration required
- HTTP client middleware for automatic LiteLLM Proxy request interception
- Complete support for chat completions and embeddings tracking
- Streaming support with time-to-first-token metrics
- Multi-provider support (OpenAI, Anthropic, Google, Azure, Cohere, and more)
- Rich metadata extraction from request headers
- Error resilient design with exponential backoff retry logic
- Zero external dependencies beyond Node.js built-ins
- Comprehensive test suites and examples

## [1.1.5] - 2025-10-21

### Fixed

- Corrected GitHub repository URLs from `revenium-io` to `revenium` organization
- Fixed repository, bugs, and homepage URLs in package.json

## [1.1.4] - 2025-10-21

### Changed

- Package renamed from `revenium-middleware-litellm-node` to `@revenium/litellm`
- Updated all documentation links to use GitHub HEAD references
- Added examples to npm package distribution
- Enhanced documentation with step-by-step getting started guide
- Standardized repository for public release

### Added

- CHANGELOG.md following Keep a Changelog format
- CODE_OF_CONDUCT.md with community guidelines
- CONTRIBUTING.md with contribution guidelines
- Package migration guide in README
- API key protection instructions in getting started guide
- Comprehensive examples guide in examples/README.md

### Fixed

- Documentation links now work correctly from npmjs.com

## [1.1.3] - 2025-09-15

### Changed

- Published as scoped package @revenium/litellm

## [1.1.2] - 2025-09-14

### Changed

- Repository standardization improvements
- Updated governance documentation

## [1.1.0] - 2025-09-13

### Fixed

- Resolved circular dependency in configuration manager
- Fixed validation for optional fields

## [1.0.0] - 2025-08-01

### Added

- Initial release
- Transparent middleware for LiteLLM Proxy usage tracking
- Automatic metadata integration
- Streaming support for real-time responses
- Fire-and-forget tracking (non-blocking)
- Multi-provider support via LiteLLM
- Comprehensive analytics tracking
- Full TypeScript and JavaScript support

[1.1.5]: https://github.com/revenium/revenium-middleware-litellm-node/releases/tag/v1.1.5
[1.1.4]: https://github.com/revenium/revenium-middleware-litellm-node/releases/tag/v1.1.4
[1.1.3]: https://github.com/revenium/revenium-middleware-litellm-node/releases/tag/v1.1.3
[1.1.2]: https://github.com/revenium/revenium-middleware-litellm-node/releases/tag/v1.1.2
[1.1.0]: https://github.com/revenium/revenium-middleware-litellm-node/releases/tag/v1.1.0
[1.0.0]: https://github.com/revenium/revenium-middleware-litellm-node/releases/tag/v1.0.0
