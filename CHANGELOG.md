# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]


## [0.18.0] - 2018-01-07
### Added
- Add instanced support


## [0.17.0] - 2017-12-29
### Added
- Add Scene#clipPane


## [0.16.0] - 2017-12-27
### Added
- Add touch support
- Add WebVR polyfill
- WebVR: move and rotate object


## [0.15.0] - 2017-11-03
### Added
- WebVR: add instruction to controller buttons (press menu button)
- WebVR: press direction buttton to jump, and show grid when jump

### Changed
- Texture support Image, Canvas, Video


## [0.14.0] - 2017-10-18
### Added
- WebVR: add sittingToStandingTransform
- Object#imageEnv: add env map support
- Camera#lockY


## [0.13.0] - 2017-10-16
### Added
- Texture support CUBE_MAP


## [0.12.0] - 2017-10-13
### Added
- VertexArrayObject#setPosition
- Object#light

### Changed
- WebVR: side button to move, trigger to select, top button to jump
- VertexArrayObject#draw(preDrawCallback)
- VertexArrayObject(gl, options)
- Scene#onGamepadChanged(leftGamepad, rightGamepad, pressedGamepad, buttonIndex)


## [0.11.0] - 2017-09-29
### Added
- transparent
- wireframe


## [0.10.0] - 2017-09-27
### Added
- normal map


## [0.9.0] - 2017-09-25
### Added
- more dat.gui settings
- Trigger
- TextureCache


## [0.8.1] - 2017-09-23
### Added
- dat.gui


## [0.8.0] - 2017-09-22
### Added
- WebVR: add vive controller

### Fixed
- WebVR: glow bug


## [0.7.0] - 2017-09-21
### Added
- support WebVR


## [0.6.0] - 2017-09-20
### Added
- ObjParser


## [0.5.0] - 2017-09-18
### Added
- SSAOEffect


## [0.4.0] - 2017-09-11
### Added
- GlowEffect


## [0.3.0] - 2017-09-08
### Added
- Specular light


## [0.2.0] - 2017-09-07
### Added
- OutlineEffect


## [0.1.0] - 2017-09-06
### Added
- Scene
- Camera
- OESVertexArrayObject-polyfill

### Fixed
- Program.setUniforms bug
