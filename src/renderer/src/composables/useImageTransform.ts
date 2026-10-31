import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref, type VNodeRef } from 'vue';

import type { ImageItem } from '@shared/types';
import { isMac } from '../utils/platform';
import { useAppSettings } from './useAppSettings';

const MIN_ZOOM = 0.01;
const MAX_ZOOM = 100.0;

type ImageDimensions = { width: number; height: number };

let checkerboardPattern: CanvasPattern | null = null;
let lastPatternDpr = 0;
let lastPatternColor = '';

function getCheckerboardPattern(squareColor: string): CanvasPattern | null {
  const dpr = window.devicePixelRatio;
  if (dpr === lastPatternDpr && squareColor === lastPatternColor && checkerboardPattern) {
    return checkerboardPattern;
  }

  const size = 8 * dpr;
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = size * 2;
  patternCanvas.height = size * 2;
  const ctx = patternCanvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = squareColor;
  ctx.fillRect(0, 0, size, size);
  ctx.fillRect(size, size, size, size);
  checkerboardPattern = ctx.createPattern(patternCanvas, 'repeat');
  lastPatternDpr = dpr;
  lastPatternColor = squareColor;
  return checkerboardPattern;
}

function getImageDims(item: ImageItem | undefined): ImageDimensions | null {
  if (!item) return null;
  if (item.bitmap) {
    return { width: item.bitmap.width, height: item.bitmap.height };
  }
  if (item.width && item.height) {
    return { width: item.width, height: item.height };
  }
  return null;
}

export function useImageTransform(currentImage: Ref<ImageItem | undefined>) {
  const { wheelZoomStep } = useAppSettings();
  const imageStageRef = ref<HTMLDivElement | null>(null);
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const panOffset = ref({ x: 0, y: 0 });
  const isPanning = ref(false);
  const imageDimensions = ref<ImageDimensions | null>(null);
  const containerDimensions = ref({ width: 0, height: 0 });

  let panStartX = 0;
  let panStartY = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let panFrame = 0;
  let pendingDeltaX = 0;
  let pendingDeltaY = 0;
  let resizeObserver: ResizeObserver | null = null;
  let themeObserver: MutationObserver | null = null;
  let renderFrame = 0;
  let lastDpr = 1;
  let cachedCheckerBg = '';
  let cachedCheckerSquare = '';

  const getCheckerBg = (): string => {
    if (!cachedCheckerBg) {
      cachedCheckerBg = getComputedStyle(document.documentElement)
        .getPropertyValue('--checker-bg')
        .trim();
    }
    return cachedCheckerBg || '#2a2f35';
  };

  const getCheckerSquare = (): string => {
    if (!cachedCheckerSquare) {
      cachedCheckerSquare = getComputedStyle(document.documentElement)
        .getPropertyValue('--checker-square')
        .trim();
    }
    return cachedCheckerSquare || 'rgba(255,255,255,0.08)';
  };

  const syncCanvasSize = (): void => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const width = containerDimensions.value.width;
    const height = containerDimensions.value.height;
    if (width === 0 || height === 0) return;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr || dpr !== lastDpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      lastDpr = dpr;
    }
  };

  const renderToCanvas = (): void => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    syncCanvasSize();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ci = currentImage.value;
    if (!ci?.bitmap) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const dpr = window.devicePixelRatio;
    const cw = containerDimensions.value.width;
    const ch = containerDimensions.value.height;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.translate(cw / 2, ch / 2);
    ctx.translate(panOffset.value.x, panOffset.value.y);

    const flipScaleX = ci.flipX ? -1 : 1;
    const zoom = ci.zoom ?? 1;
    ctx.scale(zoom * flipScaleX, zoom);

    const rad = ((ci.rotation ?? 0) * Math.PI) / 180;
    ctx.rotate(rad);

    const bitmap = ci.bitmap;
    const bw = bitmap.width;
    const bh = bitmap.height;

    ctx.fillStyle = getCheckerBg();
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);

    const pattern = getCheckerboardPattern(getCheckerSquare());
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    }

    ctx.drawImage(bitmap, -bw / 2, -bh / 2);

    ctx.restore();
  };

  const scheduleRender = (): void => {
    if (renderFrame === 0) {
      renderFrame = window.requestAnimationFrame(() => {
        renderFrame = 0;
        renderToCanvas();
      });
    }
  };

  const updateContainerDimensions = (): void => {
    if (imageStageRef.value) {
      containerDimensions.value = {
        width: imageStageRef.value.clientWidth,
        height: imageStageRef.value.clientHeight
      };
      if (currentImage.value?.fitMode === 'window') {
        applyFitWindow();
      }
      scheduleRender();
    }
  };

  onMounted(() => {
    resizeObserver = new ResizeObserver(() => {
      updateContainerDimensions();
    });
    if (imageStageRef.value) {
      resizeObserver.observe(imageStageRef.value);
      updateContainerDimensions();
    }

    themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          cachedCheckerBg = '';
          cachedCheckerSquare = '';
          scheduleRender();
          break;
        }
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    themeObserver?.disconnect();
    if (renderFrame) {
      cancelAnimationFrame(renderFrame);
      renderFrame = 0;
    }
  });

  const currentZoom = computed(() => currentImage.value?.zoom ?? 1);
  const currentRotation = computed(() => currentImage.value?.rotation ?? 0);
  const currentFlipX = computed(() => (currentImage.value?.flipX ? -1 : 1));
  const zoomPercentage = computed(() => `${Math.round(currentZoom.value * 100)}%`);

  const imageStyle = computed(() => {
    if (!currentImage.value) return {};
    const translate = `translate3d(${panOffset.value.x}px, ${panOffset.value.y}px, 0)`;
    return {
      transform: `${translate} scale3d(${currentZoom.value * currentFlipX.value}, ${currentZoom.value}, 1) rotate(${currentRotation.value}deg)`
    };
  });

  const setImageStageRef: VNodeRef = (element) => {
    const el = element instanceof HTMLDivElement ? element : null;
    if (el !== imageStageRef.value) {
      if (imageStageRef.value && resizeObserver) {
        resizeObserver.unobserve(imageStageRef.value);
      }
      imageStageRef.value = el;
      if (el && resizeObserver) {
        resizeObserver.observe(el);
        updateContainerDimensions();
      }
    }
  };

  const setCanvasRef: VNodeRef = (element) => {
    const previous = canvasRef.value;
    canvasRef.value = element instanceof HTMLCanvasElement ? element : null;
    if (canvasRef.value !== previous && canvasRef.value) {
      lastDpr = 0;
      scheduleRender();
    }
  };

  const updateImageDimensions = (): void => {
    imageDimensions.value = getImageDims(currentImage.value);
  };

  const resetPan = (): void => {
    if (panOffset.value.x !== 0 || panOffset.value.y !== 0) {
      panOffset.value = { x: 0, y: 0 };
    }
  };

  const canPan = (): boolean => {
    if (!currentImage.value) {
      return false;
    }
    const dims = imageDimensions.value;
    if (containerDimensions.value.width === 0 || !dims) {
      return false;
    }
    const isRotated = currentRotation.value === 90 || currentRotation.value === 270;
    const displayWidth = isRotated ? dims.height : dims.width;
    const displayHeight = isRotated ? dims.width : dims.height;
    const renderedWidth = displayWidth * currentZoom.value;
    const renderedHeight = displayHeight * currentZoom.value;
    return (
      renderedWidth > containerDimensions.value.width ||
      renderedHeight > containerDimensions.value.height
    );
  };

  const canPanImage = computed(() => canPan());

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    if (!canPan()) {
      return;
    }
    event.preventDefault();
    isPanning.value = true;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    panStartX = panOffset.value.x;
    panStartY = panOffset.value.y;
    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!isPanning.value) {
      return;
    }
    event.preventDefault();
    pendingDeltaX = event.clientX - pointerStartX;
    pendingDeltaY = event.clientY - pointerStartY;
    if (panFrame === 0) {
      panFrame = window.requestAnimationFrame(() => {
        panFrame = 0;
        panOffset.value = {
          x: panStartX + pendingDeltaX,
          y: panStartY + pendingDeltaY
        };
      });
    }
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (!isPanning.value) {
      return;
    }
    isPanning.value = false;
    const target = event.currentTarget as HTMLElement | null;
    target?.releasePointerCapture?.(event.pointerId);
  };

  const zoomIn = (step = 0.1): void => {
    if (!currentImage.value) {
      return;
    }
    currentImage.value.zoom = Math.min(currentZoom.value + step, MAX_ZOOM);
    scheduleRender();
  };

  const zoomOut = (step = 0.1): void => {
    if (!currentImage.value) {
      return;
    }
    currentImage.value.zoom = Math.max(currentZoom.value - step, MIN_ZOOM);
    scheduleRender();
  };

  const handleWheel = (event: WheelEvent): void => {
    if (!currentImage.value) {
      return;
    }
    event.preventDefault();

    const step = wheelZoomStep.value;

    if (event.deltaY < 0) {
      if (isMac) {
        zoomOut(step);
      } else {
        zoomIn(step);
      }
    } else if (event.deltaY > 0) {
      if (isMac) {
        zoomIn(step);
      } else {
        zoomOut(step);
      }
    }
  };

  const rotateRight = (): void => {
    if (!currentImage.value) {
      return;
    }
    resetPan();
    currentImage.value.rotation = (currentRotation.value + 90) % 360;
    scheduleRender();
  };

  const flipHorizontal = (): void => {
    if (!currentImage.value) {
      return;
    }
    currentImage.value.flipX = !currentImage.value.flipX;
    scheduleRender();
  };

  const applyFitWindow = (): void => {
    const dims = getImageDims(currentImage.value);
    if (!dims || containerDimensions.value.width === 0) return;
    if (dims.width === 0 || dims.height === 0) return;

    const isRotated = currentRotation.value === 90 || currentRotation.value === 270;
    const displayWidth = isRotated ? dims.height : dims.width;
    const displayHeight = isRotated ? dims.width : dims.height;

    const scale = Math.min(
      containerDimensions.value.width / displayWidth,
      containerDimensions.value.height / displayHeight
    );
    currentImage.value!.zoom = scale;
  };

  const setFitMode = (mode: 'actual' | 'window'): void => {
    if (!currentImage.value) {
      return;
    }
    currentImage.value.fitMode = mode;
    resetPan();
    if (mode === 'window') {
      applyFitWindow();
    } else {
      currentImage.value.zoom = 1;
    }
    scheduleRender();
  };

  const initFitMode = (): void => {
    const dims = getImageDims(currentImage.value);
    if (!dims || containerDimensions.value.width === 0) return;

    if (
      dims.width > containerDimensions.value.width ||
      dims.height > containerDimensions.value.height
    ) {
      setFitMode('window');
    } else {
      setFitMode('actual');
    }
  };

  watch(
    panOffset,
    () => {
      scheduleRender();
    },
    { deep: true }
  );

  return {
    imageStageRef,
    canvasRef,
    panOffset,
    isPanning,
    canPanImage,
    imageDimensions,
    imageStyle,
    zoomPercentage,
    containerDimensions,
    setImageStageRef,
    setCanvasRef,
    updateImageDimensions,
    resetPan,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    zoomIn,
    zoomOut,
    rotateRight,
    flipHorizontal,
    setFitMode,
    applyFitWindow,
    initFitMode,
    renderToCanvas,
    scheduleRender
  };
}
