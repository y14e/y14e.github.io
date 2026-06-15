// node_modules/@y14e/menu/dist/index.js
var min = Math.min;
var max = Math.max;
var round = Math.round;
var floor = Math.floor;
var createCoords = (v) => ({
  x: v,
  y: v
});
var oppositeSideMap = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
  const firstChar = placement[0];
  return firstChar === "t" || firstChar === "b" ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
}
var lrPlacement = ["left", "right"];
var rlPlacement = ["right", "left"];
var tbPlacement = ["top", "bottom"];
var btPlacement = ["bottom", "top"];
function getSideList(side, isStart, rtl) {
  switch (side) {
    case "top":
    case "bottom":
      if (rtl) return isStart ? rlPlacement : lrPlacement;
      return isStart ? lrPlacement : rlPlacement;
    case "left":
    case "right":
      return isStart ? tbPlacement : btPlacement;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  const side = getSide(placement);
  return oppositeSideMap[side] + placement.slice(side.length);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number" ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  const {
    x,
    y,
    width,
    height
  } = rect;
  return {
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    x,
    y
  };
}
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case "start":
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case "end":
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform: platform2,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
    element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === "floating" ? {
    x,
    y,
    width: rects.floating.width,
    height: rects.floating.height
  } : rects.reference;
  const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
  const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) ? await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}
var MAX_RESET_COUNT = 50;
var computePosition = async (reference, floating, config) => {
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2
  } = config;
  const platformWithDetectOverflow = platform2.detectOverflow ? platform2 : {
    ...platform2,
    detectOverflow
  };
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
  let rects = await platform2.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let resetCount = 0;
  const middlewareData = {};
  for (let i = 0; i < middleware.length; i++) {
    const currentMiddleware = middleware[i];
    if (!currentMiddleware) {
      continue;
    }
    const {
      name,
      fn
    } = currentMiddleware;
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform: platformWithDetectOverflow,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData[name] = {
      ...middlewareData[name],
      ...data
    };
    if (reset && resetCount < MAX_RESET_COUNT) {
      resetCount++;
      if (typeof reset === "object") {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform2.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};
var arrow = (options) => ({
  name: "arrow",
  options,
  async fn(state) {
    const {
      x,
      y,
      placement,
      rects,
      platform: platform2,
      elements,
      middlewareData
    } = state;
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x,
      y
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform2.getDimensions(element);
    const isYAxis = axis === "y";
    const minProp = isYAxis ? "top" : "left";
    const maxProp = isYAxis ? "bottom" : "right";
    const clientProp = isYAxis ? "clientHeight" : "clientWidth";
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
    if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
    const min$1 = minPadding;
    const max2 = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset3 = clamp(min$1, center, max2);
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset3 && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max2 : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset3,
        centerOffset: center - offset3 - alignmentOffset,
        ...shouldAddOffset && {
          alignmentOffset
        }
      },
      reset: shouldAddOffset
    };
  }
});
var flip = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "flip",
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform: platform2,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = "bestFit",
        fallbackAxisSideDirection = "none",
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const initialSideAxis = getSideAxis(initialPlacement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
      if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements2 = [initialPlacement, ...fallbackPlacements];
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides2 = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];
      if (!overflows.every((side2) => side2 <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements2[nextIndex];
        if (nextPlacement) {
          const ignoreCrossAxisOverflow = checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false;
          if (!ignoreCrossAxisOverflow || // We leave the current main axis only if every placement on that axis
          // overflows the main axis.
          overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) {
            return {
              data: {
                index: nextIndex,
                overflows: overflowsData
              },
              reset: {
                placement: nextPlacement
              }
            };
          }
        }
        let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case "bestFit": {
              var _overflowsData$filter2;
              const placement2 = (_overflowsData$filter2 = overflowsData.filter((d) => {
                if (hasFallbackAxisSideDirection) {
                  const currentSideAxis = getSideAxis(d.placement);
                  return currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  currentSideAxis === "y";
                }
                return true;
              }).map((d) => [d.placement, d.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
              if (placement2) {
                resetPlacement = placement2;
              }
              break;
            }
            case "initialPlacement":
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};
var originSides = /* @__PURE__ */ new Set(["left", "top"]);
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform: platform2,
    elements
  } = state;
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = originSides.has(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === "number" ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: rawValue.mainAxis || 0,
    crossAxis: rawValue.crossAxis || 0,
    alignmentAxis: rawValue.alignmentAxis
  };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}
var offset = function(options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: "offset",
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};
var shift = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "shift",
    options,
    async fn(state) {
      const {
        x,
        y,
        placement,
        platform: platform2
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: (_ref) => {
            let {
              x: x2,
              y: y2
            } = _ref;
            return {
              x: x2,
              y: y2
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === "y" ? "top" : "left";
        const maxSide = mainAxis === "y" ? "bottom" : "right";
        const min2 = mainAxisCoord + overflow[minSide];
        const max2 = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min2, mainAxisCoord, max2);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === "y" ? "top" : "left";
        const maxSide = crossAxis === "y" ? "bottom" : "right";
        const min2 = crossAxisCoord + overflow[minSide];
        const max2 = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min2, crossAxisCoord, max2);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y,
          enabled: {
            [mainAxis]: checkMainAxis,
            [crossAxis]: checkCrossAxis
          }
        }
      };
    }
  };
};
function hasWindow() {
  return typeof window !== "undefined";
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || "").toLowerCase();
  }
  return "#document";
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  if (!hasWindow() || typeof ShadowRoot === "undefined") {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle2(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
}
function isTableElement(element) {
  return /^(table|td|th)$/.test(getNodeName(element));
}
function isTopLayer(element) {
  try {
    if (element.matches(":popover-open")) {
      return true;
    }
  } catch (_e) {
  }
  try {
    return element.matches(":modal");
  } catch (_e) {
    return false;
  }
}
var willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
var containRe = /paint|layout|strict|content/;
var isNotNone = (value) => !!value && value !== "none";
var isWebKitValue;
function isContainingBlock(elementOrCss) {
  const css = isElement(elementOrCss) ? getComputedStyle2(elementOrCss) : elementOrCss;
  return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else if (isTopLayer(currentNode)) {
      return null;
    }
    currentNode = getParentNode(currentNode);
  }
  return null;
}
function isWebKit() {
  if (isWebKitValue == null) {
    isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
  }
  return isWebKitValue;
}
function isLastTraversableNode(node) {
  return /^(html|body|#document)$/.test(getNodeName(node));
}
function getComputedStyle2(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.scrollX,
    scrollTop: element.scrollY
  };
}
function getParentNode(node) {
  if (getNodeName(node) === "html") {
    return node;
  }
  const result = (
    // Step into the shadow DOM of the parent of a slotted node.
    node.assignedSlot || // DOM Element detected.
    node.parentNode || // ShadowRoot detected.
    isShadowRoot(node) && node.host || // Fallback.
    getDocumentElement(node)
  );
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    const frameElement = getFrameElement(win);
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
  } else {
    return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
  }
}
function getFrameElement(win) {
  return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}
function getCssDimensions(element) {
  const css = getComputedStyle2(element);
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}
function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}
function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect.width) : rect.width) / width;
  let y = ($ ? round(rect.height) : rect.height) / height;
  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}
var noOffsets = /* @__PURE__ */ createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) {
    return false;
  }
  return isFixed;
}
function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = getFrameElement(currentWin);
    while (currentIFrame && offsetParent && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle2(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = getFrameElement(currentWin);
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}
function getWindowScrollBarX(element, rect) {
  const leftScroll = getNodeScroll(element).scrollLeft;
  if (!rect) {
    return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
  }
  return rect.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
  const htmlRect = documentElement.getBoundingClientRect();
  const x = htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect);
  const y = htmlRect.top + scroll.scrollTop;
  return {
    x,
    y
  };
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === "fixed";
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
  };
}
function getClientRects(element) {
  return Array.from(element.getClientRects());
}
function getDocumentRect(element) {
  const html = getDocumentElement(element);
  const scroll = getNodeScroll(element);
  const body = element.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(element);
  const y = -scroll.scrollTop;
  if (getComputedStyle2(body).direction === "rtl") {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}
var SCROLLBAR_MAX = 25;
function getViewportRect(element, strategy) {
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isWebKit();
    if (!visualViewportBased || visualViewportBased && strategy === "fixed") {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  const windowScrollbarX = getWindowScrollBarX(html);
  if (windowScrollbarX <= 0) {
    const doc = html.ownerDocument;
    const body = doc.body;
    const bodyStyles = getComputedStyle(body);
    const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
    const clippingStableScrollbarWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
    if (clippingStableScrollbarWidth <= SCROLLBAR_MAX) {
      width -= clippingStableScrollbarWidth;
    }
  } else if (windowScrollbarX <= SCROLLBAR_MAX) {
    width += windowScrollbarX;
  }
  return {
    width,
    height,
    x,
    y
  };
}
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = isHTMLElement(element) ? getScale(element) : createCoords(1);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === "viewport") {
    rect = getViewportRect(element, strategy);
  } else if (clippingAncestor === "document") {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y,
      width: clippingAncestor.width,
      height: clippingAncestor.height
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
  const parentNode = getParentNode(element);
  if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
    return false;
  }
  return getComputedStyle2(parentNode).position === "fixed" || hasFixedPositionAncestor(parentNode, stopNode);
}
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle2(element).position === "fixed";
  let currentNode = elementIsFixed ? getParentNode(element) : element;
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle2(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === "fixed") {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === "static" && !!currentContainingBlockComputedStyle && (currentContainingBlockComputedStyle.position === "absolute" || currentContainingBlockComputedStyle.position === "fixed") || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode);
    if (shouldDropCurrentNode) {
      result = result.filter((ancestor) => ancestor !== currentNode);
    } else {
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
  let top = firstRect.top;
  let right = firstRect.right;
  let bottom = firstRect.bottom;
  let left = firstRect.left;
  for (let i = 1; i < clippingAncestors.length; i++) {
    const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
    top = max(rect.top, top);
    right = min(rect.right, right);
    bottom = min(rect.bottom, bottom);
    left = max(rect.left, left);
  }
  return {
    width: right - left,
    height: bottom - top,
    x: left,
    y: top
  };
}
function getDimensions(element) {
  const {
    width,
    height
  } = getCssDimensions(element);
  return {
    width,
    height
  };
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === "fixed";
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  function setLeftRTLScrollbarOffset() {
    offsets.x = getWindowScrollBarX(documentElement);
  }
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      setLeftRTLScrollbarOffset();
    }
  }
  if (isFixed && !isOffsetParentAnElement && documentElement) {
    setLeftRTLScrollbarOffset();
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  const x = rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x;
  const y = rect.top + scroll.scrollTop - offsets.y - htmlOffset.y;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height
  };
}
function isStaticPositioned(element) {
  return getComputedStyle2(element).position === "static";
}
function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement(element) || getComputedStyle2(element).position === "fixed") {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  let rawOffsetParent = element.offsetParent;
  if (getDocumentElement(element) === rawOffsetParent) {
    rawOffsetParent = rawOffsetParent.ownerDocument.body;
  }
  return rawOffsetParent;
}
function getOffsetParent(element, polyfill) {
  const win = getWindow(element);
  if (isTopLayer(element)) {
    return win;
  }
  if (!isHTMLElement(element)) {
    let svgOffsetParent = getParentNode(element);
    while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
      if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
        return svgOffsetParent;
      }
      svgOffsetParent = getParentNode(svgOffsetParent);
    }
    return win;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
    return win;
  }
  return offsetParent || getContainingBlock(element) || win;
}
var getElementRects = async function(data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  const floatingDimensions = await getDimensionsFn(data.floating);
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      width: floatingDimensions.width,
      height: floatingDimensions.height
    }
  };
};
function isRTL(element) {
  return getComputedStyle2(element).direction === "rtl";
}
var platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};
function rectsAreEqual(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
function observeMove(element, onMove) {
  let io = null;
  let timeoutId;
  const root = getDocumentElement(element);
  function cleanup() {
    var _io;
    clearTimeout(timeoutId);
    (_io = io) == null || _io.disconnect();
    io = null;
  }
  function refresh(skip, threshold) {
    if (skip === void 0) {
      skip = false;
    }
    if (threshold === void 0) {
      threshold = 1;
    }
    cleanup();
    const elementRectForRootMargin = element.getBoundingClientRect();
    const {
      left,
      top,
      width,
      height
    } = elementRectForRootMargin;
    if (!skip) {
      onMove();
    }
    if (!width || !height) {
      return;
    }
    const insetTop = floor(top);
    const insetRight = floor(root.clientWidth - (left + width));
    const insetBottom = floor(root.clientHeight - (top + height));
    const insetLeft = floor(left);
    const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
    const options = {
      rootMargin,
      threshold: max(0, min(1, threshold)) || 1
    };
    let isFirstUpdate = true;
    function handleObserve(entries) {
      const ratio = entries[0].intersectionRatio;
      if (ratio !== threshold) {
        if (!isFirstUpdate) {
          return refresh();
        }
        if (!ratio) {
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 1e3);
        } else {
          refresh(false, ratio);
        }
      }
      if (ratio === 1 && !rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) {
        refresh();
      }
      isFirstUpdate = false;
    }
    try {
      io = new IntersectionObserver(handleObserve, {
        ...options,
        // Handle <iframe>s
        root: root.ownerDocument
      });
    } catch (_e) {
      io = new IntersectionObserver(handleObserve, options);
    }
    io.observe(element);
  }
  refresh(true);
  return cleanup;
}
function autoUpdate(reference, floating, update, options) {
  if (options === void 0) {
    options = {};
  }
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === "function",
    layoutShift = typeof IntersectionObserver === "function",
    animationFrame = false
  } = options;
  const referenceEl = unwrapElement(reference);
  const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
  ancestors.forEach((ancestor) => {
    ancestorScroll && ancestor.addEventListener("scroll", update, {
      passive: true
    });
    ancestorResize && ancestor.addEventListener("resize", update);
  });
  const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
  let reobserveFrame = -1;
  let resizeObserver = null;
  if (elementResize) {
    resizeObserver = new ResizeObserver((_ref) => {
      let [firstEntry] = _ref;
      if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
        resizeObserver.unobserve(floating);
        cancelAnimationFrame(reobserveFrame);
        reobserveFrame = requestAnimationFrame(() => {
          var _resizeObserver;
          (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
        });
      }
      update();
    });
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
    if (floating) {
      resizeObserver.observe(floating);
    }
  }
  let frameId;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
  if (animationFrame) {
    frameLoop();
  }
  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);
    if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) {
      update();
    }
    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }
  update();
  return () => {
    var _resizeObserver2;
    ancestors.forEach((ancestor) => {
      ancestorScroll && ancestor.removeEventListener("scroll", update);
      ancestorResize && ancestor.removeEventListener("resize", update);
    });
    cleanupIo == null || cleanupIo();
    (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
    resizeObserver = null;
    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}
var offset2 = offset;
var shift2 = shift;
var flip2 = flip;
var arrow2 = arrow;
var computePosition2 = (reference, floating, options) => {
  const cache = /* @__PURE__ */ new Map();
  const mergedOptions = {
    platform,
    ...options
  };
  const platformWithCache = {
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};
var defaultParser = (value) => value.split(/\s+/);
var defaultSerializer = (tokens) => tokens.join(" ");
function addTokenToAttribute(element, attribute, token, options = {}) {
  const {
    caseInsensitive = false,
    parse = defaultParser,
    serialize = defaultSerializer
  } = options;
  const value = element.getAttribute(attribute)?.trim();
  const tokens = value ? parse(value).filter(Boolean) : [];
  if (caseInsensitive) {
    const lower = token.toLowerCase();
    if (tokens.every((token2) => token2.toLowerCase() !== lower)) {
      tokens.push(token);
      element.setAttribute(attribute, serialize(tokens));
    }
    return;
  }
  const set = new Set(tokens);
  set.add(token);
  element.setAttribute(attribute, serialize([...set]));
}
var snapshots = /* @__PURE__ */ new WeakMap();
function restoreAttributes(elements) {
  for (const element of elements) {
    const snapshot = snapshots.get(element);
    if (!snapshot) {
      continue;
    }
    for (const [attribute, value] of snapshot.entries()) {
      value === null ? element.removeAttribute(attribute) : element.setAttribute(attribute, value);
    }
    snapshots.delete(element);
  }
}
function saveAttributes(elements, attributes) {
  elements.forEach((element) => {
    let snapshot = snapshots.get(element);
    if (!snapshot) {
      snapshot = /* @__PURE__ */ new Map();
      snapshots.set(element, snapshot);
    }
    attributes.forEach((attribute) => {
      snapshot.set(attribute, element.getAttribute(attribute));
    });
  });
}
var snapshots2 = /* @__PURE__ */ new WeakMap();
function restoreAttributes2(elements) {
  for (const element of elements) {
    const snapshot = snapshots2.get(element);
    if (!snapshot) {
      continue;
    }
    for (const [attribute, value] of snapshot.entries()) {
      value === null ? element.removeAttribute(attribute) : element.setAttribute(attribute, value);
    }
    snapshots2.delete(element);
  }
}
function saveAttributes2(elements, attributes) {
  elements.forEach((element) => {
    let snapshot = snapshots2.get(element);
    if (!snapshot) {
      snapshot = /* @__PURE__ */ new Map();
      snapshots2.set(element, snapshot);
    }
    attributes.forEach((attribute) => {
      snapshot.set(attribute, element.getAttribute(attribute));
    });
  });
}
var FOCUSABLE_SELECTOR = `:is(a[href], area[href], button, embed, iframe, input:not([type="hidden" i]), object, select, details > summary:first-of-type, textarea, [contenteditable]:not([contenteditable="false" i]), [controls], [tabindex]):not(:disabled, [hidden], [inert], [tabindex="-1"])`;
function getFocusables(container = document.body, options = {}) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element. Fallback: <body> element.");
    container = document.body;
  }
  let {
    composed = false,
    filter,
    include,
    skipNegativeTabIndexCheck = false,
    skipVisibilityCheck = false
  } = options;
  if (typeof composed !== "boolean") {
    console.warn("Invalid composed option. Fallback: false.");
    composed = false;
  }
  if (typeof filter !== "undefined" && typeof filter !== "function") {
    console.warn(
      "Invalid filter function. Fallback: no filter function (undefined)."
    );
    filter = void 0;
  }
  if (typeof include !== "undefined" && typeof include !== "function") {
    console.warn(
      "Invalid include function. Fallback: no include function (undefined)."
    );
    include = void 0;
  }
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  const elements = [];
  if (composed || include) {
    let traverse2 = function(node) {
      if (node instanceof Element) {
        if (isFocusable(node, {
          skipNegativeTabIndexCheck,
          skipVisibilityCheck
        }) || include?.(node)) {
          elements[elements.length] = node;
        }
      }
      const children = getComposedChildren(node);
      for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];
        if (!child) {
          continue;
        }
        traverse2(child);
      }
    };
    traverse2(container);
  } else {
    const candidates = container.querySelectorAll(FOCUSABLE_SELECTOR);
    for (let i = 0, l = candidates.length; i < l; i++) {
      const candidate = candidates[i];
      if (!(candidate instanceof Element)) {
        continue;
      }
      if (isFocusable(candidate, {
        skipNegativeTabIndexCheck,
        skipVisibilityCheck
      })) {
        elements[elements.length] = candidate;
      }
    }
  }
  const unfiltered = normalizeRadioGroup(sortByTabIndex(elements));
  return filter ? unfiltered.filter(filter) : unfiltered;
}
function getNextFocusable(container = document.body, options = {}) {
  return getRelativeFocusable(container, 1, options);
}
function getPreviousFocusable(container = document.body, options = {}) {
  return getRelativeFocusable(container, -1, options);
}
function isFocusable(element, options = {}) {
  if (!(element instanceof Element)) {
    console.warn("Invalid element");
    return false;
  }
  let { skipNegativeTabIndexCheck = false, skipVisibilityCheck = false } = options;
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  if (element.hasAttribute("hidden") || isInert(element)) {
    return false;
  }
  if (!skipNegativeTabIndexCheck && getTabIndex(element) < 0) {
    return false;
  }
  if (!element.matches(
    skipNegativeTabIndexCheck ? FOCUSABLE_SELECTOR.replace(/(,\s*)?\[tabindex="-1"\]/g, "") : FOCUSABLE_SELECTOR
  )) {
    return false;
  }
  if (isDisabledDeep(element)) {
    return false;
  }
  if (!skipVisibilityCheck && !element.checkVisibility({
    contentVisibilityAuto: true,
    opacityProperty: true,
    visibilityProperty: true
  })) {
    return false;
  }
  return true;
}
function getRelativeFocusable(container, offset3, options) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element. Fallback: <body> element.");
    container = document.body;
  }
  let {
    anchor = getActiveElement(),
    composed = false,
    filter,
    include,
    skipNegativeTabIndexCheck = false,
    skipVisibilityCheck = false,
    wrap = false
  } = options;
  if (!(anchor instanceof Element)) {
    const active = getActiveElement();
    if (active instanceof Element) {
      console.warn("Invalid anchor element. Fallback: active element.");
      anchor = active;
    } else {
      console.warn("Invalid anchor element");
      return null;
    }
  }
  if (!containsComposed(container, anchor)) {
    console.warn("Anchor (active) element not within container");
    return null;
  }
  if (typeof composed !== "boolean") {
    console.warn("Invalid composed option. Fallback: false.");
    composed = false;
  }
  if (typeof filter !== "undefined" && typeof filter !== "function") {
    console.warn(
      "Invalid filter function. Fallback: no filter function (undefined)."
    );
    filter = void 0;
  }
  if (typeof include !== "undefined" && typeof include !== "function") {
    console.warn(
      "Invalid include function. Fallback: no include function (undefined)."
    );
    include = void 0;
  }
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  if (typeof wrap !== "boolean") {
    console.warn("Invalid wrap option. Fallback: false.");
    wrap = false;
  }
  const settings = { composed, skipNegativeTabIndexCheck, skipVisibilityCheck };
  if (filter !== void 0) {
    Object.assign(settings, { filter });
  }
  if (include !== void 0) {
    Object.assign(settings, { include });
  }
  const focusables = getFocusables(container, settings);
  const { length } = focusables;
  if (!length) {
    return null;
  }
  const currentIndex = focusables.indexOf(anchor);
  if (currentIndex === -1) {
    return null;
  }
  const offsetIndex = currentIndex + offset3;
  if ((offsetIndex < 0 || offsetIndex >= length) && !wrap) {
    return null;
  }
  return focusables[(offsetIndex + length) % length] ?? null;
}
function isDisabledDeep(element) {
  let current = element;
  while (current) {
    if (current instanceof ShadowRoot) {
      if (current.mode !== "open") {
        return false;
      }
      current = current.host;
      continue;
    }
    if (!(current instanceof Element)) {
      current = current.parentNode;
      continue;
    }
    if (current === element && isFormControl(current) && isDisabled(current)) {
      return true;
    }
    if (isInert(current)) {
      return true;
    }
    if (isFormControl(element) && current.tagName === "FIELDSET" && isDisabled(current)) {
      if (!current.querySelector(":scope > legend:first-of-type")?.contains(element)) {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}
function normalizeRadioGroup(elements) {
  let map = null;
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!(element instanceof HTMLInputElement)) {
      continue;
    }
    if (!isUngroupedRadio(element)) {
      continue;
    }
    if (!map) {
      map = /* @__PURE__ */ new Map();
    }
    const key = `${element.form?.id ?? "no-form"}::${element.name}`;
    const group = map.get(key) ?? map.set(key, []).get(key);
    if (group) {
      group[group.length] = element;
    }
  }
  if (!map) {
    return elements;
  }
  const placeholder = /* @__PURE__ */ new Set();
  for (const group of map.values()) {
    placeholder.add(group.find((radio) => radio.checked) ?? group[0]);
  }
  return elements.filter((element) => {
    if (isUngroupedRadio(element)) {
      return placeholder.has(element);
    }
    return true;
  });
}
function sortByTabIndex(elements) {
  const ordered = [];
  const natural = [];
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!element) {
      continue;
    }
    const target = getTabIndex(element) > 0 ? ordered : natural;
    target[target.length] = element;
  }
  ordered.sort((a, b) => getTabIndex(a) - getTabIndex(b));
  let count = 0;
  const sorted = new Array(ordered.length + natural.length);
  for (let i = 0, l = ordered.length; i < l; i++) {
    sorted[count++] = ordered[i];
  }
  for (let i = 0, l = natural.length; i < l; i++) {
    sorted[count++] = natural[i];
  }
  return sorted;
}
function containsComposed(container, element) {
  let current = element;
  while (current) {
    if (current === container) {
      return true;
    }
    current = current instanceof ShadowRoot ? current.mode === "open" ? current.host : null : current.parentNode;
  }
  return false;
}
function getComposedChildren(node) {
  if (node instanceof ShadowRoot) {
    return getChildren(node);
  }
  if (!(node instanceof Element)) {
    return [];
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedElements({ flatten: true });
    if (assigned.length) {
      return assigned;
    }
  }
  if (node instanceof HTMLElement && node.shadowRoot?.mode === "open") {
    return getChildren(node.shadowRoot);
  }
  return getChildren(node);
}
function getActiveElement() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}
function getChildren(node) {
  const elements = [];
  for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
    elements[elements.length] = child;
  }
  return elements;
}
function getTabIndex(element) {
  return "tabIndex" in element ? Number(element.tabIndex) : 0;
}
function isDisabled(element) {
  return "disabled" in element && !!element.disabled;
}
function isFormControl(element) {
  const name = element.tagName;
  return name === "BUTTON" || name === "INPUT" || name === "SELECT" || name === "TEXTAREA";
}
function isInert(element) {
  return "inert" in element && !!element.inert;
}
function isUngroupedRadio(element) {
  return element instanceof HTMLInputElement && element.type === "radio" && !!element.name;
}
var VISUALLY_HIDDEN_CSS = `border: 0; clip: rect(0, 0, 0, 0); height: 1px; margin: -1px; overflow: hidden; padding: 0; position: absolute; user-select: none; white-space: nowrap; width: 1px;`;
function createPortal(host, container = document.body) {
  if (!(host instanceof Element)) {
    console.warn("Invalid host element");
    return () => {
    };
  }
  if (host.hasAttribute("data-portaled")) {
    console.warn("Already portaled");
    return () => {
    };
  }
  if (!(container instanceof Element)) {
    console.warn("Invalid container element. Fallback: <body> element.");
    container = document.body;
  }
  if (containsComposed2(host, container)) {
    console.warn("Host element cannot contain the container element");
    return () => {
    };
  }
  const portal = new Portal(host, container);
  return () => portal.destroy();
}
var Portal = class {
  #host;
  #container;
  #entranceSentinel;
  #exitSentinel;
  #focusables = /* @__PURE__ */ new Set();
  #controller = null;
  #timer;
  #isDestroyed = false;
  constructor(host, container) {
    this.#host = host;
    this.#container = container;
    this.#entranceSentinel = this.#createSentinel();
    this.#exitSentinel = this.#createSentinel();
    this.#initialize();
  }
  destroy() {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    if (this.#timer !== void 0) {
      cancelAnimationFrame(this.#timer);
      this.#timer = void 0;
    }
    restoreAttributes2([...this.#focusables]);
    this.#focusables.clear();
    this.#exitSentinel.after(this.#host);
    this.#entranceSentinel.remove();
    this.#exitSentinel.remove();
    this.#host.removeAttribute("data-portaled");
  }
  #initialize() {
    this.#host.before(this.#entranceSentinel);
    this.#entranceSentinel.after(this.#exitSentinel);
    this.#container.append(this.#host);
    this.#update();
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    document.addEventListener("focusin", this.#onFocusIn, {
      capture: true,
      signal
    });
    document.addEventListener("keydown", this.#onKeyDown, {
      capture: true,
      signal
    });
    this.#host.setAttribute("data-portaled", "");
  }
  #onFocusIn = (event) => {
    const current = event.target;
    const before = event.relatedTarget;
    if (!(before instanceof Element)) {
      return;
    }
    if (current === this.#entranceSentinel) {
      if (this.#host.contains(before)) {
        this.#moveFocus("previous");
        return;
      }
      this.#update();
      const first = [...this.#focusables][0];
      if (first) {
        focusElement(first);
      } else {
        const next = getNextFocusable(document.body, {
          anchor: this.#exitSentinel,
          composed: true
        });
        next && focusElement(next);
      }
      return;
    }
    if (current === this.#exitSentinel) {
      if (this.#host.contains(before)) {
        this.#moveFocus("next");
        return;
      }
      this.#update();
      const last = [...this.#focusables].at(-1);
      if (last) {
        focusElement(last);
      } else {
        const previous = getPreviousFocusable(document.body, {
          anchor: this.#entranceSentinel,
          composed: true
        });
        previous && focusElement(previous);
      }
      return;
    }
  };
  #onKeyDown = (event) => {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event;
    if (key !== "Tab" || altKey || ctrlKey || metaKey) {
      return;
    }
    const active = getActiveElement2();
    if (!(active instanceof Element)) {
      return;
    }
    if (!this.#host.contains(active)) {
      return;
    }
    this.#update();
    const focusables = this.#getFocusables();
    if (!focusables.length) {
      event.preventDefault();
      this.#moveFocus(shiftKey ? "previous" : "next");
      return;
    }
    const index = focusables.indexOf(active);
    if (index === -1) {
      return;
    }
    event.preventDefault();
    const focusable = focusables[index + (shiftKey ? -1 : 1)];
    focusable ? focusElement(focusable) : this.#focusSentinel(shiftKey);
  };
  #update() {
    const current = /* @__PURE__ */ new Set([
      ...this.#getFocusables(),
      ...getFocusables(this.#host, { composed: true })
    ]);
    for (const focusable of this.#focusables) {
      if (current.has(focusable)) {
        continue;
      }
      focusable.isConnected && restoreAttributes2([focusable]);
      this.#focusables.delete(focusable);
    }
    for (const focusable of current) {
      if (this.#focusables.has(focusable)) {
        continue;
      }
      this.#focusables.add(focusable);
      saveAttributes2([focusable], ["tabindex"]);
      focusable.setAttribute("tabindex", "-1");
    }
  }
  #createSentinel() {
    const sentinel = document.createElement("span");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.setAttribute("data-portal-sentinel", "");
    sentinel.setAttribute("tabindex", "0");
    sentinel.style.cssText += VISUALLY_HIDDEN_CSS;
    return sentinel;
  }
  #focusSentinel(isPrevious) {
    this.#timer && cancelAnimationFrame(this.#timer);
    this.#timer = requestAnimationFrame(
      () => (isPrevious ? this.#entranceSentinel : this.#exitSentinel).focus()
    );
  }
  #getFocusables() {
    return getFocusables(this.#host, {
      composed: true,
      include: (element) => this.#focusables.has(element)
    });
  }
  #moveFocus(direction) {
    const options = {
      anchor: direction === "previous" ? this.#entranceSentinel : this.#exitSentinel,
      composed: true
    };
    const focusable = direction === "previous" ? getPreviousFocusable(document.body, options) : getNextFocusable(document.body, options);
    focusable && focusElement(focusable);
  }
};
function containsComposed2(container, element) {
  let current = element;
  while (current) {
    if (current === container) {
      return true;
    }
    current = current instanceof ShadowRoot ? current.mode === "open" ? current.host : null : current.parentNode;
  }
  return false;
}
function focusElement(element) {
  "focus" in element && typeof element.focus === "function" && element.focus();
}
function getActiveElement2() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}
var defaultParser2 = (value) => value.split(/\s+/);
var defaultSerializer2 = (tokens) => tokens.join(" ");
function addTokenToAttribute2(element, attribute, token, options = {}) {
  const {
    caseInsensitive = false,
    parse = defaultParser2,
    serialize = defaultSerializer2
  } = options;
  const value = element.getAttribute(attribute)?.trim();
  const tokens = value ? parse(value).filter(Boolean) : [];
  if (caseInsensitive) {
    const lower = token.toLowerCase();
    if (tokens.every((token2) => token2.toLowerCase() !== lower)) {
      tokens.push(token);
      element.setAttribute(attribute, serialize(tokens));
    }
    return;
  }
  const set = new Set(tokens);
  set.add(token);
  element.setAttribute(attribute, serialize([...set]));
}
var snapshots3 = /* @__PURE__ */ new WeakMap();
function restoreAttributes3(elements) {
  for (const element of elements) {
    const snapshot = snapshots3.get(element);
    if (!snapshot) {
      continue;
    }
    for (const [attribute, value] of snapshot.entries()) {
      value === null ? element.removeAttribute(attribute) : element.setAttribute(attribute, value);
    }
    snapshots3.delete(element);
  }
}
function saveAttributes3(elements, attributes) {
  elements.forEach((element) => {
    let snapshot = snapshots3.get(element);
    if (!snapshot) {
      snapshot = /* @__PURE__ */ new Map();
      snapshots3.set(element, snapshot);
    }
    attributes.forEach((attribute) => {
      snapshot.set(attribute, element.getAttribute(attribute));
    });
  });
}
var FOCUSABLE_SELECTOR2 = `:is(a[href], area[href], button, embed, iframe, input:not([type="hidden" i]), object, select, details > summary:first-of-type, textarea, [contenteditable]:not([contenteditable="false" i]), [controls], [tabindex]):not(:disabled, [hidden], [inert], [tabindex="-1"])`;
function getFocusables2(container = document.body, options = {}) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element. Fallback: <body> element.");
    container = document.body;
  }
  let {
    composed = false,
    filter,
    include,
    skipNegativeTabIndexCheck = false,
    skipVisibilityCheck = false
  } = options;
  if (typeof composed !== "boolean") {
    console.warn("Invalid composed option. Fallback: false.");
    composed = false;
  }
  if (typeof filter !== "undefined" && typeof filter !== "function") {
    console.warn(
      "Invalid filter function. Fallback: no filter function (undefined)."
    );
    filter = void 0;
  }
  if (typeof include !== "undefined" && typeof include !== "function") {
    console.warn(
      "Invalid include function. Fallback: no include function (undefined)."
    );
    include = void 0;
  }
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  const elements = [];
  if (composed || include) {
    let traverse2 = function(node) {
      if (node instanceof Element) {
        if (isFocusable2(node, {
          skipNegativeTabIndexCheck,
          skipVisibilityCheck
        }) || include?.(node)) {
          elements[elements.length] = node;
        }
      }
      const children = getComposedChildren2(node);
      for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];
        if (!child) {
          continue;
        }
        traverse2(child);
      }
    };
    traverse2(container);
  } else {
    const candidates = container.querySelectorAll(FOCUSABLE_SELECTOR2);
    for (let i = 0, l = candidates.length; i < l; i++) {
      const candidate = candidates[i];
      if (!(candidate instanceof Element)) {
        continue;
      }
      if (isFocusable2(candidate, {
        skipNegativeTabIndexCheck,
        skipVisibilityCheck
      })) {
        elements[elements.length] = candidate;
      }
    }
  }
  const unfiltered = normalizeRadioGroup2(sortByTabIndex2(elements));
  return filter ? unfiltered.filter(filter) : unfiltered;
}
function isFocusable2(element, options = {}) {
  if (!(element instanceof Element)) {
    console.warn("Invalid element");
    return false;
  }
  let { skipNegativeTabIndexCheck = false, skipVisibilityCheck = false } = options;
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  if (element.hasAttribute("hidden") || isInert2(element)) {
    return false;
  }
  if (!skipNegativeTabIndexCheck && getTabIndex2(element) < 0) {
    return false;
  }
  if (!element.matches(
    skipNegativeTabIndexCheck ? FOCUSABLE_SELECTOR2.replace(/(,\s*)?\[tabindex="-1"\]/g, "") : FOCUSABLE_SELECTOR2
  )) {
    return false;
  }
  if (isDisabledDeep2(element)) {
    return false;
  }
  if (!skipVisibilityCheck && !element.checkVisibility({
    contentVisibilityAuto: true,
    opacityProperty: true,
    visibilityProperty: true
  })) {
    return false;
  }
  return true;
}
function isDisabledDeep2(element) {
  let current = element;
  while (current) {
    if (current instanceof ShadowRoot) {
      if (current.mode !== "open") {
        return false;
      }
      current = current.host;
      continue;
    }
    if (!(current instanceof Element)) {
      current = current.parentNode;
      continue;
    }
    if (current === element && isFormControl2(current) && isDisabled2(current)) {
      return true;
    }
    if (isInert2(current)) {
      return true;
    }
    if (isFormControl2(element) && current.tagName === "FIELDSET" && isDisabled2(current)) {
      if (!current.querySelector(":scope > legend:first-of-type")?.contains(element)) {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}
function normalizeRadioGroup2(elements) {
  let map = null;
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!(element instanceof HTMLInputElement)) {
      continue;
    }
    if (!isUngroupedRadio2(element)) {
      continue;
    }
    if (!map) {
      map = /* @__PURE__ */ new Map();
    }
    const key = `${element.form?.id ?? "no-form"}::${element.name}`;
    const group = map.get(key) ?? map.set(key, []).get(key);
    if (group) {
      group[group.length] = element;
    }
  }
  if (!map) {
    return elements;
  }
  const placeholder = /* @__PURE__ */ new Set();
  for (const group of map.values()) {
    placeholder.add(group.find((radio) => radio.checked) ?? group[0]);
  }
  return elements.filter((element) => {
    if (isUngroupedRadio2(element)) {
      return placeholder.has(element);
    }
    return true;
  });
}
function sortByTabIndex2(elements) {
  const ordered = [];
  const natural = [];
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!element) {
      continue;
    }
    const target = getTabIndex2(element) > 0 ? ordered : natural;
    target[target.length] = element;
  }
  ordered.sort((a, b) => getTabIndex2(a) - getTabIndex2(b));
  let count = 0;
  const sorted = new Array(ordered.length + natural.length);
  for (let i = 0, l = ordered.length; i < l; i++) {
    sorted[count++] = ordered[i];
  }
  for (let i = 0, l = natural.length; i < l; i++) {
    sorted[count++] = natural[i];
  }
  return sorted;
}
function getComposedChildren2(node) {
  if (node instanceof ShadowRoot) {
    return getChildren2(node);
  }
  if (!(node instanceof Element)) {
    return [];
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedElements({ flatten: true });
    if (assigned.length) {
      return assigned;
    }
  }
  if (node instanceof HTMLElement && node.shadowRoot?.mode === "open") {
    return getChildren2(node.shadowRoot);
  }
  return getChildren2(node);
}
function getChildren2(node) {
  const elements = [];
  for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
    elements[elements.length] = child;
  }
  return elements;
}
function getTabIndex2(element) {
  return "tabIndex" in element ? Number(element.tabIndex) : 0;
}
function isDisabled2(element) {
  return "disabled" in element && !!element.disabled;
}
function isFormControl2(element) {
  const name = element.tagName;
  return name === "BUTTON" || name === "INPUT" || name === "SELECT" || name === "TEXTAREA";
}
function isInert2(element) {
  return "inert" in element && !!element.inert;
}
function isUngroupedRadio2(element) {
  return element instanceof HTMLInputElement && element.type === "radio" && !!element.name;
}
function createRovingTabIndex(container, options = {}) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element");
    return () => {
    };
  }
  let {
    direction,
    navigationOnly = false,
    noMemory = false,
    noStart = false,
    selector,
    typeahead = false,
    wrap = false
  } = options;
  if (typeof direction !== "undefined" && !["horizontal", "vertical"].includes(direction)) {
    console.warn("Invalid direction option. Fallback: both (undefined).");
    direction = void 0;
  }
  if (typeof navigationOnly !== "boolean") {
    console.warn("Invalid navigationOnly option. Fallback: false.");
    navigationOnly = false;
  }
  if (typeof noMemory !== "boolean") {
    console.warn("Invalid noMemory option. Fallback: false.");
    noMemory = false;
  }
  if (typeof noStart !== "boolean") {
    console.warn("Invalid noStart option. Fallback: false.");
    noStart = false;
  }
  if (typeof selector !== "undefined" && (typeof selector !== "string" || !selector.trim())) {
    console.warn(
      "Invalid selector. Fallback: all focusable elements (undefined)."
    );
    selector = void 0;
  }
  if (typeof typeahead !== "boolean") {
    console.warn("Invalid typeahead option. Fallback: false.");
    typeahead = false;
  }
  if (typeof wrap !== "boolean") {
    console.warn("Invalid wrap option. Fallback: false.");
    wrap = false;
  }
  const settings = {
    navigationOnly,
    noMemory,
    noStart,
    typeahead,
    wrap
  };
  direction && Object.assign(settings, { direction });
  selector && Object.assign(settings, { selector });
  const roving = new RovingTabIndex(container, settings);
  return () => roving.destroy();
}
var RovingTabIndex = class {
  #container;
  #options;
  #focusables = /* @__PURE__ */ new Set();
  #focusablesByFirstChar = /* @__PURE__ */ new Map();
  #selectorFilter;
  #controller = null;
  #isDestroyed = false;
  constructor(container, options = {}) {
    this.#container = container;
    this.#options = options;
    this.#selectorFilter = this.#createSelectorFilter();
    this.#initialize();
  }
  destroy() {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    restoreAttributes3([...this.#focusables]);
    this.#focusables.clear();
    this.#focusablesByFirstChar.clear();
    this.#container.removeAttribute("data-roving-tabindex-initialized");
  }
  #initialize() {
    this.#update(document.activeElement);
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    document.addEventListener("focusin", this.#onFocusIn, {
      capture: true,
      signal
    });
    document.addEventListener("keydown", this.#onKeyDown, {
      capture: true,
      signal
    });
    this.#container.setAttribute("data-roving-tabindex-initialized", "");
  }
  #onFocusIn = (event) => {
    const { target } = event;
    if (!(target instanceof Element)) {
      return;
    }
    const isFocusable22 = this.#focusables.has(target);
    if (this.#options.noMemory && !isFocusable22) {
      this.#update(null);
      return;
    }
    isFocusable22 && this.#update(target);
  };
  #onKeyDown = (event) => {
    if (!event.composedPath().includes(this.#container)) {
      return;
    }
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event;
    if (altKey || ctrlKey || metaKey || shiftKey) {
      return;
    }
    const { direction, typeahead, wrap } = this.#options;
    const isBoth = !direction;
    const isHorizontal = direction === "horizontal";
    if (![
      "End",
      "Home",
      ...isBoth ? ["ArrowLeft", "ArrowUp"] : [`Arrow${isHorizontal ? "Left" : "Up"}`],
      ...isBoth ? ["ArrowRight", "ArrowDown"] : [`Arrow${isHorizontal ? "Right" : "Down"}`]
    ].includes(key)) {
      if (!typeahead || !/^\S$/i.test(key) || !this.#focusablesByFirstChar.has(key.toUpperCase())) {
        return;
      }
    }
    const active = getActiveElement3();
    if (!(active instanceof HTMLElement)) {
      return;
    }
    const current = this.#getFocusables();
    if (!current.includes(active)) {
      return;
    }
    event.preventDefault();
    const currentIndex = current.indexOf(active);
    let rawIndex;
    let newIndex = currentIndex;
    let target = current;
    switch (key) {
      case "End":
        newIndex = -1;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        rawIndex = currentIndex - 1;
        newIndex = wrap ? rawIndex : Math.max(rawIndex, 0);
        break;
      case "ArrowRight":
      case "ArrowDown":
        rawIndex = currentIndex + 1;
        newIndex = wrap ? rawIndex % current.length : Math.min(rawIndex, current.length - 1);
        break;
      default: {
        target = this.#focusablesByFirstChar.get(key.toUpperCase()) ?? [];
        const foundIndex = target.findIndex(
          (focusable2) => current.indexOf(focusable2) > currentIndex
        );
        newIndex = foundIndex >= 0 ? foundIndex : 0;
      }
    }
    const focusable = target.at(newIndex);
    focusable && focusElement2(focusable);
  };
  #update(active) {
    const current = new Set(this.#getFocusables());
    for (const focusable of this.#focusables) {
      if (current.has(focusable)) {
        continue;
      }
      focusable.isConnected && restoreAttributes3([focusable]);
      this.#focusables.delete(focusable);
      this.#focusablesByFirstChar.forEach((focusables) => {
        const index = focusables.indexOf(focusable);
        index >= 0 && focusables.splice(index, 1);
      });
    }
    const { navigationOnly, noStart, typeahead } = this.#options;
    for (const focusable of current) {
      if (this.#focusables.has(focusable)) {
        continue;
      }
      this.#focusables.add(focusable);
      if (!navigationOnly) {
        saveAttributes3([focusable], ["tabindex"]);
        focusable.setAttribute("tabindex", "-1");
      }
      if (!typeahead) {
        continue;
      }
      const value = focusable.ariaKeyShortcuts?.trim();
      const keys = new Set(
        value ? value.split(/\s+/).filter((key) => /^\S$/i.test(key)).map((key) => key.toUpperCase()) : []
      );
      const char = focusable.textContent?.trim()?.at(0)?.toUpperCase();
      if (char) {
        keys.add(char);
        saveAttributes3([focusable], ["aria-keyshortcuts"]);
        addTokenToAttribute2(focusable, "aria-keyshortcuts", char, {
          caseInsensitive: true
        });
      }
      keys.forEach((key) => {
        const focusables = this.#focusablesByFirstChar.get(key) ?? [];
        focusables.push(focusable);
        this.#focusablesByFirstChar.set(key, focusables);
      });
    }
    if (navigationOnly) {
      return;
    }
    if (active && this.#focusables.has(active)) {
      this.#focusables.forEach((focusable) => {
        focusable.setAttribute("tabindex", focusable === active ? "0" : "-1");
      });
      return;
    }
    [...this.#focusables].forEach((focusable, i) => {
      focusable.setAttribute("tabindex", i || noStart ? "-1" : "0");
    });
  }
  #createSelectorFilter() {
    const { selector } = this.#options;
    return (element) => !selector || [...this.#container.querySelectorAll(selector)].includes(element);
  }
  #getFocusables() {
    return getFocusables2(this.#container, {
      composed: true,
      filter: this.#selectorFilter,
      skipNegativeTabIndexCheck: !this.#options.navigationOnly,
      skipVisibilityCheck: true
    });
  }
};
function focusElement2(element) {
  "focus" in element && typeof element.focus === "function" && element.focus();
}
function getActiveElement3() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}
var Menu = class _Menu {
  static defaults = {};
  static #menus = [];
  #rootElement;
  #defaults = {
    animation: { duration: 300 },
    delay: 200,
    popover: {
      menu: {
        arrow: true,
        middleware: [flip2(), offset2(), shift2()],
        placement: "bottom-start"
      },
      submenu: {
        arrow: true,
        middleware: [flip2(), offset2(), shift2()],
        placement: "right-start"
      },
      transformOrigin: true
    },
    selector: {
      checkboxItem: '[role="menuitemcheckbox"]',
      group: '[role="group"]',
      item: '[role^="menuitem"]',
      list: '[role="menu"]',
      radioItem: '[role="menuitemradio"]',
      trigger: "[data-menu-trigger]"
    }
  };
  #settings;
  #externalTrigger;
  #isMenubar;
  #isPortal;
  #isSubmenu;
  #popoverRef;
  #triggerElement;
  #listElement;
  #itemElements;
  #checkboxItemElements = [];
  #radioItemElements = [];
  #radioItemElementsByGroup = /* @__PURE__ */ new WeakMap();
  #arrowElement;
  #controller = null;
  #cleanupPopover = null;
  #cleanupPortal = null;
  #cleanupRovingTabIndex = null;
  #timers = [];
  #animation = null;
  #submenus = [];
  #submenuTimer;
  #isDestroyed = false;
  constructor(root, options = {}, _internal = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Invalid root element");
    }
    if (root.hasAttribute("data-menu-initialized")) {
      console.warn("Already initialized");
      return;
    }
    this.#rootElement = root;
    this.#defaults = this.#mergeOptions(this.#defaults, _Menu.defaults);
    this.#settings = this.#mergeOptions(this.#defaults, options);
    matchMedia("(prefers-reduced-motion: reduce)").matches && Object.assign(this.#settings.animation, { duration: 0 });
    const {
      externalTrigger = null,
      isMenubar = false,
      isPortal = false,
      isSubmenu = false
    } = _internal;
    this.#externalTrigger = externalTrigger;
    this.#isMenubar = isMenubar;
    this.#isPortal = isPortal;
    this.#isSubmenu = isSubmenu;
    const { selector } = this.#settings;
    this.#triggerElement = this.#rootElement.querySelector(
      selector[this.#isSubmenu ? "item" : "trigger"]
    );
    this.#popoverRef = _internal.popoverRef ?? this.#triggerElement;
    this.#listElement = this.#rootElement.querySelector(
      selector.list
    );
    if (!this.#listElement) {
      console.warn("Missing list element");
      return;
    }
    this.#itemElements = [
      ...this.#listElement.querySelectorAll(
        `${selector.item}:not(:scope ${selector.list} *)`
      )
    ];
    if (!this.#itemElements.length) {
      console.warn("Missing item elements");
      return;
    }
    this.#itemElements.forEach((item) => {
      const role = item.role;
      role === "menuitemcheckbox" ? this.#checkboxItemElements.push(item) : role === "menuitemradio" && this.#radioItemElements.push(item);
    });
    this.#radioItemElements.forEach((item) => {
      let group = item.closest(selector.group);
      if (!group || !this.#rootElement.contains(group)) {
        group = this.#rootElement;
      }
      const items = this.#radioItemElementsByGroup.get(group) ?? [];
      items.push(item);
      this.#radioItemElementsByGroup.set(group, items);
    });
    const settings = this.#settings.popover[this.#isSubmenu ? "submenu" : "menu"];
    if (settings.arrow) {
      this.#arrowElement = document.createElement("div");
      this.#arrowElement.setAttribute("data-menu-arrow", "");
      this.#listElement.appendChild(this.#arrowElement);
      const middleware = settings.middleware;
      const index = middleware.findIndex((m) => m.name === "arrow");
      index >= 0 && middleware.splice(index, 1);
      middleware.push(arrow2({ element: this.#arrowElement }));
    } else {
      this.#arrowElement = null;
    }
    this.#initialize();
  }
  close() {
    this.#toggle(false);
  }
  async destroy(force = false) {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#cleanupRovingTabIndex?.();
    this.#cleanupRovingTabIndex = null;
    this.#cleanupPortal?.();
    this.#cleanupPortal = null;
    this.#cleanupPopover?.();
    this.#cleanupPopover = null;
    this.#timers.forEach((timer) => {
      cancelAnimationFrame(timer);
    });
    this.#timers.length = 0;
    this.#clearSubmenuTimer();
    _Menu.#menus = _Menu.#menus.filter((menu) => menu !== this);
    this.#submenus && await Promise.all(this.#submenus.map((submenu) => submenu.destroy()));
    if (!force) {
      try {
        await this.#animation?.finished;
      } catch {
      }
    }
    this.#animation?.cancel();
    this.#animation = null;
    const trigger = this.#getTrigger();
    const elements = this.#itemElements;
    if (trigger) {
      elements.push(trigger);
    }
    if (this.#listElement) {
      elements.push(this.#listElement);
    }
    restoreAttributes(elements);
    this.#externalTrigger = null;
    this.#triggerElement = null;
    this.#listElement = null;
    this.#itemElements.length = 0;
    this.#checkboxItemElements.length = 0;
    this.#radioItemElements.length = 0;
    this.#arrowElement = null;
    this.#rootElement.removeAttribute("data-menu-initialized");
  }
  isOpen() {
    return this.#getTrigger()?.ariaExpanded === "true";
  }
  open(_initialFocus = false) {
    this.#toggle(true, { initialFocus: _initialFocus });
  }
  #initialize() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    document.addEventListener("pointerdown", this.#onOutsidePointerDown, {
      capture: true,
      signal
    });
    this.#rootElement.addEventListener("focusout", this.#onRootFocusOut, {
      signal
    });
    if (!this.#listElement) {
      return;
    }
    saveAttributes([this.#listElement], ["aria-labelledby", "id", "role"]);
    const trigger = this.#getTrigger();
    if (trigger && this.#triggerElement) {
      saveAttributes(
        [trigger],
        [
          "aria-controls",
          "aria-disabled",
          "aria-expanded",
          "aria-haspopup",
          "id",
          "style",
          "tabindex"
        ]
      );
      const id = Math.random().toString(36).slice(-8);
      this.#listElement.id ||= `menu-list-${id}`;
      addTokenToAttribute(trigger, "aria-controls", this.#listElement.id);
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-haspopup", "true");
      trigger.id ||= `menu-trigger-${id}`;
      if (!isFocusable3(trigger)) {
        trigger.setAttribute("aria-disabled", "true");
        trigger.setAttribute("tabindex", "-1");
        trigger.style.setProperty("pointer-events", "none");
      }
      trigger.addEventListener("keydown", this.#onTriggerKeyDown, {
        signal
      });
      this.#triggerElement.addEventListener(
        "pointerdown",
        this.#onTriggerPointerDown,
        {
          signal
        }
      );
      addTokenToAttribute(this.#listElement, "aria-labelledby", trigger.id);
    }
    this.#listElement.setAttribute("role", "menu");
    this.#listElement.addEventListener("keydown", this.#onListKeyDown, {
      signal
    });
    saveAttributes(this.#itemElements, [
      "aria-disabled",
      "data-menu-disabled",
      "role",
      "style",
      "tabindex"
    ]);
    this.#itemElements.forEach((item2) => {
      const parent = item2.parentElement;
      if (parent?.querySelector(this.#settings.selector.list)) {
        this.#submenus.push(
          new _Menu(parent, this.#settings, {
            isPortal: !!this.#triggerElement,
            isSubmenu: true
          })
        );
      } else if (item2.hasAttribute("disabled") || item2.tabIndex < 0) {
        item2.setAttribute("aria-disabled", "true");
        item2.setAttribute("data-menu-disabled", "");
        item2.style.setProperty("pointer-events", "none");
      }
      [this.#checkboxItemElements, this.#radioItemElements].every(
        (list2) => !list2.includes(item2)
      ) && item2.setAttribute("role", "menuitem");
      item2.addEventListener("pointerenter", this.#onItemPointerEnter, {
        signal
      });
      item2.addEventListener("pointerleave", this.#onItemPointerLeave, {
        signal
      });
    });
    this.#checkboxItemElements.forEach((item2) => {
      item2.setAttribute("role", "menuitemcheckbox");
      item2.addEventListener("click", this.#onCheckboxItemClick, { signal });
    });
    this.#radioItemElements.forEach((item2) => {
      item2.setAttribute("role", "menuitemradio");
      item2.addEventListener("click", this.#onRadioItemClick, { signal });
    });
    const { item, list } = this.#settings.selector;
    this.#cleanupRovingTabIndex = createRovingTabIndex(this.#listElement, {
      direction: "vertical",
      noMemory: true,
      noStart: !!this.#triggerElement,
      selector: `${item}:not(:scope ${list} *, [data-menu-disabled])`,
      typeahead: true,
      wrap: true
    });
    _Menu.#menus.push(this);
    !this.#isSubmenu && this.#rootElement.setAttribute("data-menu-initialized", "");
  }
  #onOutsidePointerDown = (event) => {
    if (!this.#triggerElement || this.#includesRoot(event)) {
      return;
    }
    this.#toggle(false, { restoreFocus: false });
  };
  #onRootFocusOut = (event) => {
    const target = event.relatedTarget;
    if (!(target instanceof HTMLElement) || // Not a type guard
    !this.#containsRoot(target)) {
      this.#toggle(false, { restoreFocus: false });
    }
  };
  #onTriggerKeyDown = (event) => {
    if (this.#handleExitKeys(event)) {
      return;
    }
    const { key, shiftKey } = event;
    if (shiftKey) {
      return;
    }
    if (![
      "Enter",
      "Escape",
      " ",
      ...this.#isSubmenu ? ["ArrowRight"] : ["ArrowUp", "ArrowDown"]
    ].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    switch (key) {
      case "Enter":
      case " ":
        this.#triggerElement?.dispatchEvent(new PointerEvent("pointerdown"));
        break;
      case "Escape":
        this.#closeAndFocusTrigger();
        break;
      case "ArrowUp":
      case "ArrowRight":
      case "ArrowDown": {
        const isArrowUp = key === "ArrowUp";
        this.isOpen() ? this.#itemElements.filter(isFocusable3).at(isArrowUp ? -1 : 0)?.focus() : this.#toggle(true, {
          initialFocus: isArrowUp ? "last" : "first"
        });
        break;
      }
    }
  };
  #onTriggerPointerDown = (event) => {
    event.preventDefault();
    const trigger = this.#getTrigger();
    this.#toggle(
      this.#isSubmenu ? event.currentTarget === this.#triggerElement : trigger?.ariaExpanded !== "true",
      { initialFocus: false }
    );
    trigger?.focus({ focusVisible: false });
  };
  #onListKeyDown = (event) => {
    if (this.#handleExitKeys(event, true)) {
      return;
    }
    const { key, shiftKey } = event;
    if (shiftKey) {
      return;
    }
    if (![
      "Enter",
      "Escape",
      " ",
      ...this.#isMenubar ? ["ArrowLeft", "ArrowRight"] : []
    ].includes(key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const active = getActiveElement4();
    if (!(active instanceof HTMLElement)) {
      return;
    }
    switch (key) {
      case "Enter":
      case " ":
        active.click();
        break;
      case "Escape":
      case "ArrowLeft":
      case "ArrowRight":
        this.#dispatchTriggerKeyDown(key);
        break;
    }
  };
  #onItemPointerEnter = (event) => {
    this.#clearSubmenuTimer();
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    this.#submenuTimer = setTimeout(() => {
      this.#submenus.forEach((submenu) => {
        submenu.#toggle(submenu.#triggerElement === item);
      });
      item.focus({ focusVisible: false });
    }, this.#settings.delay);
  };
  #onItemPointerLeave = () => {
    this.#clearSubmenuTimer();
  };
  #onCheckboxItemClick = (event) => {
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.setAttribute("aria-checked", String(item.ariaChecked !== "true"));
  };
  #onRadioItemClick = (event) => {
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    const group = item.closest(this.#settings.selector.group) ?? this.#rootElement;
    this.#radioItemElementsByGroup.get(group)?.forEach((i) => {
      i.setAttribute("aria-checked", String(i === item));
    });
  };
  #toggle(isOpen, options = {}) {
    const trigger = this.#getTrigger();
    if (trigger?.ariaExpanded === String(isOpen)) {
      return;
    }
    trigger?.setAttribute("aria-expanded", String(isOpen));
    const { initialFocus = false, restoreFocus = true } = options;
    if (isOpen) {
      _Menu.#menus.filter((m) => !m.#containsRoot(this.#rootElement)).forEach((menu) => {
        menu.#toggle(false);
      });
      if (!this.#listElement) {
        return;
      }
      if (!this.#isPortal || !this.#isSubmenu && this.#triggerElement) {
        const style2 = this.#listElement.style;
        style2.setProperty("position", "fixed");
        if (!this.#cleanupPortal) {
          this.#cleanupPortal = createPortal(this.#listElement);
        }
        const timer2 = this.#timers[0];
        timer2 && cancelAnimationFrame(timer2);
        this.#timers[0] = requestAnimationFrame(
          () => style2.removeProperty("position")
        );
      }
      const timer = this.#timers[1];
      timer && cancelAnimationFrame(timer);
      this.#timers[1] = requestAnimationFrame(
        () => this.#listElement?.setAttribute("data-menu-open", "")
      );
      const { style } = this.#listElement;
      style.setProperty("display", "block");
      style.setProperty("opacity", "0");
      this.#triggerElement && this.#updatePopover();
      initialFocus && this.#itemElements.filter(isFocusable3).at(initialFocus === "first" ? 0 : -1)?.focus();
    } else {
      this.#clearSubmenuTimer();
      restoreFocus && this.#focusTrigger();
    }
    if (!this.#triggerElement) {
      return;
    }
    if (!this.#listElement) {
      return;
    }
    if (!isOpen) {
      this.#listElement.removeAttribute("data-menu-open");
      this.#cleanupPopover?.();
      this.#cleanupPopover = null;
    }
    const opacity = getComputedStyle(this.#listElement).getPropertyValue(
      "opacity"
    );
    this.#animation?.cancel();
    const animation = this.#listElement.animate(
      { opacity: isOpen ? [opacity, "1"] : [opacity, "0"] },
      { duration: this.#settings.animation.duration, easing: "ease" }
    );
    this.#animation = animation;
    const cleanupAnimation = () => {
      if (this.#animation === animation) {
        this.#animation = null;
      }
    };
    const { signal } = this.#controller ?? new AbortController();
    this.#animation.addEventListener("cancel", cleanupAnimation, {
      once: true,
      signal
    });
    this.#animation.addEventListener(
      "finish",
      () => {
        if (this.#animation !== animation) {
          return;
        }
        cleanupAnimation();
        if (!this.#listElement) {
          return;
        }
        const { style } = this.#listElement;
        if (!isOpen) {
          this.#cleanupPortal?.();
          this.#cleanupPortal = null;
          this.#listElement.removeAttribute("data-menu-placement");
          style.setProperty("display", "none");
          ["left", "top", "transform-origin"].forEach((name) => {
            style.removeProperty(name);
          });
          this.#arrowElement && ["left", "top", "rotate"].forEach((name) => {
            this.#arrowElement?.style.removeProperty(name);
          });
        }
        style.removeProperty("opacity");
      },
      { once: true, signal }
    );
  }
  #clearSubmenuTimer() {
    if (this.#submenuTimer !== void 0) {
      clearTimeout(this.#submenuTimer);
      this.#submenuTimer = void 0;
    }
  }
  #closeAndFocusTrigger() {
    this.#toggle(false);
    const timer = this.#timers[2];
    timer && cancelAnimationFrame(timer);
    this.#timers[2] = requestAnimationFrame(() => this.#focusTrigger());
  }
  #containsRoot(element) {
    return this.#rootElement.contains(element) || !!this.#listElement?.contains(element);
  }
  #dispatchTriggerKeyDown(key) {
    const trigger = this.#getTrigger();
    if (!trigger) {
      return;
    }
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key }));
  }
  #focusTrigger() {
    const active = getActiveElement4();
    if (!(active instanceof HTMLElement)) {
      return;
    }
    this.#containsRoot(active) && this.#getTrigger()?.focus();
  }
  #getTrigger() {
    return this.#externalTrigger ?? this.#triggerElement;
  }
  #handleExitKeys(event, isList = false) {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event;
    if (shiftKey && key !== "Tab" || altKey || ctrlKey || metaKey) {
      return true;
    }
    const shouldPrevent = this.#isSubmenu && key === "ArrowLeft" && isList;
    if (shiftKey && key === "Tab" || shouldPrevent) {
      if (shouldPrevent) {
        event.preventDefault();
        event.stopPropagation();
      }
      this.#closeAndFocusTrigger();
      return true;
    }
    return false;
  }
  #includesRoot(event) {
    const path = event.composedPath();
    if (!this.#listElement) {
      return false;
    }
    return path.includes(this.#rootElement) || path.includes(this.#listElement);
  }
  #mergeOptions(target, source) {
    return {
      ...target,
      ...source,
      animation: { ...target.animation, ...source.animation ?? {} },
      popover: {
        ...target.popover,
        ...source.popover ?? {},
        menu: {
          ...target.popover?.menu,
          ...source.popover?.menu ?? {},
          middleware: Object.assign(
            [...target.popover?.menu?.middleware ?? []],
            [...source.popover?.menu?.middleware ?? []]
          )
        },
        submenu: {
          ...target.popover?.submenu,
          ...source.popover?.submenu ?? {},
          middleware: Object.assign(
            [...target.popover?.submenu?.middleware ?? []],
            [...source.popover?.submenu?.middleware ?? []]
          )
        }
      },
      selector: { ...target.selector, ...source.selector ?? {} }
    };
  }
  #updatePopover() {
    if (!this.#popoverRef) {
      return;
    }
    const compute = () => {
      if (!this.#popoverRef || !this.#listElement) {
        return;
      }
      const options = this.#settings.popover[this.#isSubmenu ? "submenu" : "menu"];
      computePosition2(this.#popoverRef, this.#listElement, {
        ...options,
        placement: options.placement
      }).then(
        ({
          x: listX,
          y: listY,
          placement,
          middlewareData
        }) => {
          if (!this.#listElement) {
            return;
          }
          const { style: listStyle } = this.#listElement;
          listStyle.setProperty("left", `${listX}px`);
          listStyle.setProperty("top", `${listY}px`);
          this.#listElement.setAttribute("data-menu-placement", placement);
          this.#settings.popover.transformOrigin && listStyle.setProperty(
            "transform-origin",
            {
              top: "50% 100%",
              "top-start": "0 100%",
              "top-end": "100% 100%",
              right: "0 50%",
              "right-start": "0 0",
              "right-end": "0 100%",
              bottom: "50% 0",
              "bottom-start": "0 0",
              "bottom-end": "100% 0",
              left: "100% 50%",
              "left-start": "100% 0",
              "left-end": "100% 100%"
            }[placement]
          );
          if (!this.#arrowElement) {
            return;
          }
          const arrowX = middlewareData.arrow?.x;
          const arrowY = middlewareData.arrow?.y;
          const { style: arrowStyle } = this.#arrowElement;
          arrowStyle.setProperty("left", arrowX ? `${arrowX}px` : "");
          arrowStyle.setProperty(
            "top",
            arrowY ? `${arrowY - this.#arrowElement.offsetHeight / 2}px` : ""
          );
          const side = placement.split("-")[0];
          if (!side) {
            return;
          }
          const styles = {
            top: { position: "bottom", rotate: "225deg" },
            right: { position: "left", rotate: "315deg" },
            bottom: { position: "top", rotate: "45deg" },
            left: { position: "right", rotate: "135deg" }
          }[side];
          if (!styles) {
            return;
          }
          arrowStyle.setProperty(
            styles.position,
            `${this.#arrowElement.offsetWidth / -2}px`
          );
          arrowStyle.setProperty("rotate", styles.rotate);
        }
      );
    };
    if (!this.#cleanupPopover) {
      this.#cleanupPopover = autoUpdate(
        this.#popoverRef,
        this.#listElement,
        compute
      );
    }
  }
};
function getActiveElement4() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}
function isFocusable3(element) {
  return !element.hasAttribute("data-menu-disabled") && !element.hasAttribute("disabled");
}

// node_modules/@y14e/roving-tabindex/dist/index.js
var defaultParser3 = (value) => value.split(/\s+/);
var defaultSerializer3 = (tokens) => tokens.join(" ");
function addTokenToAttribute3(element, attribute, token, options = {}) {
  const {
    caseInsensitive = false,
    parse = defaultParser3,
    serialize = defaultSerializer3
  } = options;
  const value = element.getAttribute(attribute)?.trim();
  const tokens = value ? parse(value).filter(Boolean) : [];
  if (caseInsensitive) {
    const lower = token.toLowerCase();
    if (tokens.every((token2) => token2.toLowerCase() !== lower)) {
      tokens.push(token);
      element.setAttribute(attribute, serialize(tokens));
    }
    return;
  }
  const set = new Set(tokens);
  set.add(token);
  element.setAttribute(attribute, serialize([...set]));
}
var snapshots4 = /* @__PURE__ */ new WeakMap();
function restoreAttributes4(elements) {
  for (const element of elements) {
    const snapshot = snapshots4.get(element);
    if (!snapshot) {
      continue;
    }
    for (const [attribute, value] of snapshot.entries()) {
      value === null ? element.removeAttribute(attribute) : element.setAttribute(attribute, value);
    }
    snapshots4.delete(element);
  }
}
function saveAttributes4(elements, attributes) {
  elements.forEach((element) => {
    let snapshot = snapshots4.get(element);
    if (!snapshot) {
      snapshot = /* @__PURE__ */ new Map();
      snapshots4.set(element, snapshot);
    }
    attributes.forEach((attribute) => {
      snapshot.set(attribute, element.getAttribute(attribute));
    });
  });
}
var FOCUSABLE_SELECTOR3 = `:is(a[href], area[href], button, embed, iframe, input:not([type="hidden" i]), object, select, details > summary:first-of-type, textarea, [contenteditable]:not([contenteditable="false" i]), [controls], [tabindex]):not(:disabled, [hidden], [inert], [tabindex="-1"])`;
function getFocusables3(container = document.body, options = {}) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element. Fallback: <body> element.");
    container = document.body;
  }
  let {
    composed = false,
    filter,
    include,
    skipNegativeTabIndexCheck = false,
    skipVisibilityCheck = false
  } = options;
  if (typeof composed !== "boolean") {
    console.warn("Invalid composed option. Fallback: false.");
    composed = false;
  }
  if (typeof filter !== "undefined" && typeof filter !== "function") {
    console.warn(
      "Invalid filter function. Fallback: no filter function (undefined)."
    );
    filter = void 0;
  }
  if (typeof include !== "undefined" && typeof include !== "function") {
    console.warn(
      "Invalid include function. Fallback: no include function (undefined)."
    );
    include = void 0;
  }
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  const elements = [];
  if (composed || include) {
    let traverse2 = function(node) {
      if (node instanceof Element) {
        if (isFocusable4(node, {
          skipNegativeTabIndexCheck,
          skipVisibilityCheck
        }) || include?.(node)) {
          elements[elements.length] = node;
        }
      }
      const children = getComposedChildren3(node);
      for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];
        if (!child) {
          continue;
        }
        traverse2(child);
      }
    };
    traverse2(container);
  } else {
    const candidates = container.querySelectorAll(FOCUSABLE_SELECTOR3);
    for (let i = 0, l = candidates.length; i < l; i++) {
      const candidate = candidates[i];
      if (!(candidate instanceof Element)) {
        continue;
      }
      if (isFocusable4(candidate, {
        skipNegativeTabIndexCheck,
        skipVisibilityCheck
      })) {
        elements[elements.length] = candidate;
      }
    }
  }
  const unfiltered = normalizeRadioGroup3(sortByTabIndex3(elements));
  return filter ? unfiltered.filter(filter) : unfiltered;
}
function isFocusable4(element, options = {}) {
  if (!(element instanceof Element)) {
    console.warn("Invalid element");
    return false;
  }
  let { skipNegativeTabIndexCheck = false, skipVisibilityCheck = false } = options;
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  if (element.hasAttribute("hidden") || isInert3(element)) {
    return false;
  }
  if (!skipNegativeTabIndexCheck && getTabIndex3(element) < 0) {
    return false;
  }
  if (!element.matches(
    skipNegativeTabIndexCheck ? FOCUSABLE_SELECTOR3.replace(/(,\s*)?\[tabindex="-1"\]/g, "") : FOCUSABLE_SELECTOR3
  )) {
    return false;
  }
  if (isDisabledDeep3(element)) {
    return false;
  }
  if (!skipVisibilityCheck && !element.checkVisibility({
    contentVisibilityAuto: true,
    opacityProperty: true,
    visibilityProperty: true
  })) {
    return false;
  }
  return true;
}
function isDisabledDeep3(element) {
  let current = element;
  while (current) {
    if (current instanceof ShadowRoot) {
      if (current.mode !== "open") {
        return false;
      }
      current = current.host;
      continue;
    }
    if (!(current instanceof Element)) {
      current = current.parentNode;
      continue;
    }
    if (current === element && isFormControl3(current) && isDisabled3(current)) {
      return true;
    }
    if (isInert3(current)) {
      return true;
    }
    if (isFormControl3(element) && current.tagName === "FIELDSET" && isDisabled3(current)) {
      if (!current.querySelector(":scope > legend:first-of-type")?.contains(element)) {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}
function normalizeRadioGroup3(elements) {
  let map = null;
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!(element instanceof HTMLInputElement)) {
      continue;
    }
    if (!isUngroupedRadio3(element)) {
      continue;
    }
    if (!map) {
      map = /* @__PURE__ */ new Map();
    }
    const key = `${element.form?.id ?? "no-form"}::${element.name}`;
    const group = map.get(key) ?? map.set(key, []).get(key);
    if (group) {
      group[group.length] = element;
    }
  }
  if (!map) {
    return elements;
  }
  const placeholder = /* @__PURE__ */ new Set();
  for (const group of map.values()) {
    placeholder.add(group.find((radio) => radio.checked) ?? group[0]);
  }
  return elements.filter((element) => {
    if (isUngroupedRadio3(element)) {
      return placeholder.has(element);
    }
    return true;
  });
}
function sortByTabIndex3(elements) {
  const ordered = [];
  const natural = [];
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!element) {
      continue;
    }
    const target = getTabIndex3(element) > 0 ? ordered : natural;
    target[target.length] = element;
  }
  ordered.sort((a, b) => getTabIndex3(a) - getTabIndex3(b));
  let count = 0;
  const sorted = new Array(ordered.length + natural.length);
  for (let i = 0, l = ordered.length; i < l; i++) {
    sorted[count++] = ordered[i];
  }
  for (let i = 0, l = natural.length; i < l; i++) {
    sorted[count++] = natural[i];
  }
  return sorted;
}
function getComposedChildren3(node) {
  if (node instanceof ShadowRoot) {
    return getChildren3(node);
  }
  if (!(node instanceof Element)) {
    return [];
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedElements({ flatten: true });
    if (assigned.length) {
      return assigned;
    }
  }
  if (node instanceof HTMLElement && node.shadowRoot?.mode === "open") {
    return getChildren3(node.shadowRoot);
  }
  return getChildren3(node);
}
function getChildren3(node) {
  const elements = [];
  for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
    elements[elements.length] = child;
  }
  return elements;
}
function getTabIndex3(element) {
  return "tabIndex" in element ? Number(element.tabIndex) : 0;
}
function isDisabled3(element) {
  return "disabled" in element && !!element.disabled;
}
function isFormControl3(element) {
  const name = element.tagName;
  return name === "BUTTON" || name === "INPUT" || name === "SELECT" || name === "TEXTAREA";
}
function isInert3(element) {
  return "inert" in element && !!element.inert;
}
function isUngroupedRadio3(element) {
  return element instanceof HTMLInputElement && element.type === "radio" && !!element.name;
}
function createRovingTabIndex2(container, options = {}) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element");
    return () => {
    };
  }
  let {
    direction,
    navigationOnly = false,
    noMemory = false,
    noStart = false,
    selector,
    typeahead = false,
    wrap = false
  } = options;
  if (typeof direction !== "undefined" && !["horizontal", "vertical"].includes(direction)) {
    console.warn("Invalid direction option. Fallback: both (undefined).");
    direction = void 0;
  }
  if (typeof navigationOnly !== "boolean") {
    console.warn("Invalid navigationOnly option. Fallback: false.");
    navigationOnly = false;
  }
  if (typeof noMemory !== "boolean") {
    console.warn("Invalid noMemory option. Fallback: false.");
    noMemory = false;
  }
  if (typeof noStart !== "boolean") {
    console.warn("Invalid noStart option. Fallback: false.");
    noStart = false;
  }
  if (typeof selector !== "undefined" && (typeof selector !== "string" || !selector.trim())) {
    console.warn(
      "Invalid selector. Fallback: all focusable elements (undefined)."
    );
    selector = void 0;
  }
  if (typeof typeahead !== "boolean") {
    console.warn("Invalid typeahead option. Fallback: false.");
    typeahead = false;
  }
  if (typeof wrap !== "boolean") {
    console.warn("Invalid wrap option. Fallback: false.");
    wrap = false;
  }
  const settings = {
    navigationOnly,
    noMemory,
    noStart,
    typeahead,
    wrap
  };
  direction && Object.assign(settings, { direction });
  selector && Object.assign(settings, { selector });
  const roving = new RovingTabIndex2(container, settings);
  return () => roving.destroy();
}
var RovingTabIndex2 = class {
  #container;
  #options;
  #focusables = /* @__PURE__ */ new Set();
  #focusablesByFirstChar = /* @__PURE__ */ new Map();
  #selectorFilter;
  #controller = null;
  #isDestroyed = false;
  constructor(container, options = {}) {
    this.#container = container;
    this.#options = options;
    this.#selectorFilter = this.#createSelectorFilter();
    this.#initialize();
  }
  destroy() {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    restoreAttributes4([...this.#focusables]);
    this.#focusables.clear();
    this.#focusablesByFirstChar.clear();
    this.#container.removeAttribute("data-roving-tabindex-initialized");
  }
  #initialize() {
    this.#update(document.activeElement);
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    document.addEventListener("focusin", this.#onFocusIn, {
      capture: true,
      signal
    });
    document.addEventListener("keydown", this.#onKeyDown, {
      capture: true,
      signal
    });
    this.#container.setAttribute("data-roving-tabindex-initialized", "");
  }
  #onFocusIn = (event) => {
    const { target } = event;
    if (!(target instanceof Element)) {
      return;
    }
    const isFocusable22 = this.#focusables.has(target);
    if (this.#options.noMemory && !isFocusable22) {
      this.#update(null);
      return;
    }
    isFocusable22 && this.#update(target);
  };
  #onKeyDown = (event) => {
    if (!event.composedPath().includes(this.#container)) {
      return;
    }
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event;
    if (altKey || ctrlKey || metaKey || shiftKey) {
      return;
    }
    const { direction, typeahead, wrap } = this.#options;
    const isBoth = !direction;
    const isHorizontal = direction === "horizontal";
    if (![
      "End",
      "Home",
      ...isBoth ? ["ArrowLeft", "ArrowUp"] : [`Arrow${isHorizontal ? "Left" : "Up"}`],
      ...isBoth ? ["ArrowRight", "ArrowDown"] : [`Arrow${isHorizontal ? "Right" : "Down"}`]
    ].includes(key)) {
      if (!typeahead || !/^\S$/i.test(key) || !this.#focusablesByFirstChar.has(key.toUpperCase())) {
        return;
      }
    }
    const active = getActiveElement5();
    if (!(active instanceof HTMLElement)) {
      return;
    }
    const current = this.#getFocusables();
    if (!current.includes(active)) {
      return;
    }
    event.preventDefault();
    const currentIndex = current.indexOf(active);
    let rawIndex;
    let newIndex = currentIndex;
    let target = current;
    switch (key) {
      case "End":
        newIndex = -1;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        rawIndex = currentIndex - 1;
        newIndex = wrap ? rawIndex : Math.max(rawIndex, 0);
        break;
      case "ArrowRight":
      case "ArrowDown":
        rawIndex = currentIndex + 1;
        newIndex = wrap ? rawIndex % current.length : Math.min(rawIndex, current.length - 1);
        break;
      default: {
        target = this.#focusablesByFirstChar.get(key.toUpperCase()) ?? [];
        const foundIndex = target.findIndex(
          (focusable2) => current.indexOf(focusable2) > currentIndex
        );
        newIndex = foundIndex >= 0 ? foundIndex : 0;
      }
    }
    const focusable = target.at(newIndex);
    focusable && focusElement3(focusable);
  };
  #update(active) {
    const current = new Set(this.#getFocusables());
    for (const focusable of this.#focusables) {
      if (current.has(focusable)) {
        continue;
      }
      focusable.isConnected && restoreAttributes4([focusable]);
      this.#focusables.delete(focusable);
      this.#focusablesByFirstChar.forEach((focusables) => {
        const index = focusables.indexOf(focusable);
        index >= 0 && focusables.splice(index, 1);
      });
    }
    const { navigationOnly, noStart, typeahead } = this.#options;
    for (const focusable of current) {
      if (this.#focusables.has(focusable)) {
        continue;
      }
      this.#focusables.add(focusable);
      if (!navigationOnly) {
        saveAttributes4([focusable], ["tabindex"]);
        focusable.setAttribute("tabindex", "-1");
      }
      if (!typeahead) {
        continue;
      }
      const value = focusable.ariaKeyShortcuts?.trim();
      const keys = new Set(
        value ? value.split(/\s+/).filter((key) => /^\S$/i.test(key)).map((key) => key.toUpperCase()) : []
      );
      const char = focusable.textContent?.trim()?.at(0)?.toUpperCase();
      if (char) {
        keys.add(char);
        saveAttributes4([focusable], ["aria-keyshortcuts"]);
        addTokenToAttribute3(focusable, "aria-keyshortcuts", char, {
          caseInsensitive: true
        });
      }
      keys.forEach((key) => {
        const focusables = this.#focusablesByFirstChar.get(key) ?? [];
        focusables.push(focusable);
        this.#focusablesByFirstChar.set(key, focusables);
      });
    }
    if (navigationOnly) {
      return;
    }
    if (active && this.#focusables.has(active)) {
      this.#focusables.forEach((focusable) => {
        focusable.setAttribute("tabindex", focusable === active ? "0" : "-1");
      });
      return;
    }
    [...this.#focusables].forEach((focusable, i) => {
      focusable.setAttribute("tabindex", i || noStart ? "-1" : "0");
    });
  }
  #createSelectorFilter() {
    const { selector } = this.#options;
    return (element) => !selector || [...this.#container.querySelectorAll(selector)].includes(element);
  }
  #getFocusables() {
    return getFocusables3(this.#container, {
      composed: true,
      filter: this.#selectorFilter,
      skipNegativeTabIndexCheck: !this.#options.navigationOnly,
      skipVisibilityCheck: true
    });
  }
};
function focusElement3(element) {
  "focus" in element && typeof element.focus === "function" && element.focus();
}
function getActiveElement5() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}

// node_modules/power-focusable/dist/index.js
var FOCUSABLE_SELECTOR4 = `:is(a[href], area[href], button, embed, iframe, input:not([type="hidden" i]), object, select, details > summary:first-of-type, textarea, [contenteditable]:not([contenteditable="false" i]), [controls], [tabindex]):not(:disabled, [hidden], [inert], [tabindex="-1"])`;
function getFocusables4(container = document.body, options = {}) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element. Fallback: <body> element.");
    container = document.body;
  }
  let {
    composed = false,
    filter,
    include,
    skipNegativeTabIndexCheck = false,
    skipVisibilityCheck = false
  } = options;
  if (typeof composed !== "boolean") {
    console.warn("Invalid composed option. Fallback: false.");
    composed = false;
  }
  if (typeof filter !== "undefined" && typeof filter !== "function") {
    console.warn(
      "Invalid filter function. Fallback: no filter function (undefined)."
    );
    filter = void 0;
  }
  if (typeof include !== "undefined" && typeof include !== "function") {
    console.warn(
      "Invalid include function. Fallback: no include function (undefined)."
    );
    include = void 0;
  }
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  const elements = [];
  if (composed || include) {
    let traverse2 = function(node) {
      if (node instanceof Element) {
        if (isFocusable5(node, {
          skipNegativeTabIndexCheck,
          skipVisibilityCheck
        }) || include?.(node)) {
          elements[elements.length] = node;
        }
      }
      const children = getComposedChildren4(node);
      for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];
        if (!child) {
          continue;
        }
        traverse2(child);
      }
    };
    traverse2(container);
  } else {
    const candidates = container.querySelectorAll(FOCUSABLE_SELECTOR4);
    for (let i = 0, l = candidates.length; i < l; i++) {
      const candidate = candidates[i];
      if (!(candidate instanceof Element)) {
        continue;
      }
      if (isFocusable5(candidate, {
        skipNegativeTabIndexCheck,
        skipVisibilityCheck
      })) {
        elements[elements.length] = candidate;
      }
    }
  }
  const unfiltered = normalizeRadioGroup4(sortByTabIndex4(elements));
  return filter ? unfiltered.filter(filter) : unfiltered;
}
function getNextFocusable2(container = document.body, options = {}) {
  return getRelativeFocusable2(container, 1, options);
}
function isFocusable5(element, options = {}) {
  if (!(element instanceof Element)) {
    console.warn("Invalid element");
    return false;
  }
  let { skipNegativeTabIndexCheck = false, skipVisibilityCheck = false } = options;
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  if (element.hasAttribute("hidden") || isInert4(element)) {
    return false;
  }
  if (!skipNegativeTabIndexCheck && getTabIndex4(element) < 0) {
    return false;
  }
  if (!element.matches(
    skipNegativeTabIndexCheck ? FOCUSABLE_SELECTOR4.replace(/(,\s*)?\[tabindex="-1"\]/g, "") : FOCUSABLE_SELECTOR4
  )) {
    return false;
  }
  if (isDisabledDeep4(element)) {
    return false;
  }
  if (!skipVisibilityCheck && !element.checkVisibility({
    contentVisibilityAuto: true,
    opacityProperty: true,
    visibilityProperty: true
  })) {
    return false;
  }
  return true;
}
function getRelativeFocusable2(container, offset3, options) {
  if (!(container instanceof Element)) {
    console.warn("Invalid container element. Fallback: <body> element.");
    container = document.body;
  }
  let {
    anchor = getActiveElement6(),
    composed = false,
    filter,
    include,
    skipNegativeTabIndexCheck = false,
    skipVisibilityCheck = false,
    wrap = false
  } = options;
  if (!(anchor instanceof Element)) {
    const active = getActiveElement6();
    if (active instanceof Element) {
      console.warn("Invalid anchor element. Fallback: active element.");
      anchor = active;
    } else {
      console.warn("Invalid anchor element");
      return null;
    }
  }
  if (!containsComposed3(container, anchor)) {
    console.warn("Anchor (active) element not within container");
    return null;
  }
  if (typeof composed !== "boolean") {
    console.warn("Invalid composed option. Fallback: false.");
    composed = false;
  }
  if (typeof filter !== "undefined" && typeof filter !== "function") {
    console.warn(
      "Invalid filter function. Fallback: no filter function (undefined)."
    );
    filter = void 0;
  }
  if (typeof include !== "undefined" && typeof include !== "function") {
    console.warn(
      "Invalid include function. Fallback: no include function (undefined)."
    );
    include = void 0;
  }
  if (typeof skipNegativeTabIndexCheck !== "boolean") {
    console.warn("Invalid skipNegativeTabIndexCheck option. Fallback: false.");
    skipNegativeTabIndexCheck = false;
  }
  if (typeof skipVisibilityCheck !== "boolean") {
    console.warn("Invalid skipVisibilityCheck option. Fallback: false.");
    skipVisibilityCheck = false;
  }
  if (typeof wrap !== "boolean") {
    console.warn("Invalid wrap option. Fallback: false.");
    wrap = false;
  }
  const settings = { composed, skipNegativeTabIndexCheck, skipVisibilityCheck };
  if (filter !== void 0) {
    Object.assign(settings, { filter });
  }
  if (include !== void 0) {
    Object.assign(settings, { include });
  }
  const focusables = getFocusables4(container, settings);
  const { length } = focusables;
  if (!length) {
    return null;
  }
  const currentIndex = focusables.indexOf(anchor);
  if (currentIndex === -1) {
    return null;
  }
  const offsetIndex = currentIndex + offset3;
  if ((offsetIndex < 0 || offsetIndex >= length) && !wrap) {
    return null;
  }
  return focusables[(offsetIndex + length) % length] ?? null;
}
function isDisabledDeep4(element) {
  let current = element;
  while (current) {
    if (current instanceof ShadowRoot) {
      if (current.mode !== "open") {
        return false;
      }
      current = current.host;
      continue;
    }
    if (!(current instanceof Element)) {
      current = current.parentNode;
      continue;
    }
    if (current === element && isFormControl4(current) && isDisabled4(current)) {
      return true;
    }
    if (isInert4(current)) {
      return true;
    }
    if (isFormControl4(element) && current.tagName === "FIELDSET" && isDisabled4(current)) {
      if (!current.querySelector(":scope > legend:first-of-type")?.contains(element)) {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}
function normalizeRadioGroup4(elements) {
  let map = null;
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!(element instanceof HTMLInputElement)) {
      continue;
    }
    if (!isUngroupedRadio4(element)) {
      continue;
    }
    if (!map) {
      map = /* @__PURE__ */ new Map();
    }
    const key = `${element.form?.id ?? "no-form"}::${element.name}`;
    const group = map.get(key) ?? map.set(key, []).get(key);
    if (group) {
      group[group.length] = element;
    }
  }
  if (!map) {
    return elements;
  }
  const placeholder = /* @__PURE__ */ new Set();
  for (const group of map.values()) {
    placeholder.add(group.find((radio) => radio.checked) ?? group[0]);
  }
  return elements.filter((element) => {
    if (isUngroupedRadio4(element)) {
      return placeholder.has(element);
    }
    return true;
  });
}
function sortByTabIndex4(elements) {
  const ordered = [];
  const natural = [];
  for (let i = 0, l = elements.length; i < l; i++) {
    const element = elements[i];
    if (!element) {
      continue;
    }
    const target = getTabIndex4(element) > 0 ? ordered : natural;
    target[target.length] = element;
  }
  ordered.sort((a, b) => getTabIndex4(a) - getTabIndex4(b));
  let count = 0;
  const sorted = new Array(ordered.length + natural.length);
  for (let i = 0, l = ordered.length; i < l; i++) {
    sorted[count++] = ordered[i];
  }
  for (let i = 0, l = natural.length; i < l; i++) {
    sorted[count++] = natural[i];
  }
  return sorted;
}
function containsComposed3(container, element) {
  let current = element;
  while (current) {
    if (current === container) {
      return true;
    }
    current = current instanceof ShadowRoot ? current.mode === "open" ? current.host : null : current.parentNode;
  }
  return false;
}
function getComposedChildren4(node) {
  if (node instanceof ShadowRoot) {
    return getChildren4(node);
  }
  if (!(node instanceof Element)) {
    return [];
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedElements({ flatten: true });
    if (assigned.length) {
      return assigned;
    }
  }
  if (node instanceof HTMLElement && node.shadowRoot?.mode === "open") {
    return getChildren4(node.shadowRoot);
  }
  return getChildren4(node);
}
function getActiveElement6() {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) {
    current = current.shadowRoot.activeElement;
  }
  return current;
}
function getChildren4(node) {
  const elements = [];
  for (let child = node.firstElementChild; child; child = child.nextElementSibling) {
    elements[elements.length] = child;
  }
  return elements;
}
function getTabIndex4(element) {
  return "tabIndex" in element ? Number(element.tabIndex) : 0;
}
function isDisabled4(element) {
  return "disabled" in element && !!element.disabled;
}
function isFormControl4(element) {
  const name = element.tagName;
  return name === "BUTTON" || name === "INPUT" || name === "SELECT" || name === "TEXTAREA";
}
function isInert4(element) {
  return "inert" in element && !!element.inert;
}
function isUngroupedRadio4(element) {
  return element instanceof HTMLInputElement && element.type === "radio" && !!element.name;
}

// src/index.ts
var Path = class _Path {
  static defaults = {};
  #rootElement;
  #defaults = {
    animation: { duration: 300 },
    delay: 200,
    popover: {
      arrow: true,
      middleware: [flip2(), offset2(), shift2()],
      placement: "bottom-start"
    },
    selector: {
      item: "li",
      list: "ol",
      menu: {
        item: '[role^="menuitem"]',
        list: '[role="menu"]',
        trigger: "[data-menu-trigger]"
      }
    }
  };
  #settings;
  #listElement;
  #itemElements;
  #linkElements;
  #bindings = /* @__PURE__ */ new WeakMap();
  #controller = null;
  #cleanupRovingTabIndex = null;
  #autoOpen = false;
  #menus = [];
  #isDestroyed = false;
  constructor(root, options = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Invalid root element");
    }
    if (root.hasAttribute("data-path-initialized")) {
      console.warn("Already initialized");
      return;
    }
    this.#rootElement = root;
    this.#defaults = this.#mergeOptions(this.#defaults, _Path.defaults);
    this.#settings = this.#mergeOptions(this.#defaults, options);
    matchMedia("(prefers-reduced-motion: reduce)").matches && Object.assign(this.#settings.animation, { duration: 0 });
    const { selector } = this.#settings;
    this.#listElement = this.#rootElement.querySelector(
      selector.list
    );
    if (!this.#listElement) {
      console.warn("Missing list element");
      return;
    }
    this.#itemElements = [
      ...this.#listElement.querySelectorAll(
        `${selector.item}:not(:scope ${selector.list} *)`
      )
    ];
    if (!this.#itemElements.length) {
      console.warn("Missing item elements");
      return;
    }
    this.#linkElements = [];
    this.#itemElements.forEach((item) => {
      const link = item.querySelector("a");
      link && this.#linkElements.push(link);
    });
    if (!this.#linkElements.length) {
      console.warn("Missing <a> elements");
      return;
    }
    this.#initialize();
  }
  async destroy(force = false) {
    if (this.#isDestroyed) {
      return;
    }
    this.#isDestroyed = true;
    this.#controller?.abort();
    this.#controller = null;
    this.#cleanupRovingTabIndex?.();
    this.#cleanupRovingTabIndex = null;
    await Promise.all(this.#menus.map((menu) => menu.destroy(force)));
    this.#menus.length = 0;
    const elements = this.#itemElements;
    if (this.#listElement) {
      elements.push(this.#listElement);
    }
    this.#listElement = null;
    this.#itemElements.length = 0;
    this.#rootElement.removeAttribute("data-path-initialized");
  }
  #initialize() {
    this.#controller = new AbortController();
    const { signal } = this.#controller;
    if (!this.#listElement) {
      return;
    }
    this.#listElement.addEventListener("focusin", this.#onFocusIn, { signal });
    this.#listElement.addEventListener("focusout", this.#onFocusOut, {
      signal
    });
    this.#linkElements.forEach((link) => {
      link.addEventListener("keydown", this.#onKeyDown, { signal });
      const root = link.closest(this.#settings.selector.item);
      if (!(root instanceof HTMLElement)) {
        return;
      }
      const { animation, delay, popover, selector } = this.#settings;
      if (!root.querySelector(selector.menu.trigger)) {
        return;
      }
      const menu = new Menu(
        root,
        {
          animation,
          delay,
          popover: { menu: popover },
          selector: selector.menu
        },
        { externalTrigger: link, isMenubar: true }
      );
      this.#bindings.set(link, createBinding(link, menu));
      this.#menus.push(menu);
    });
    this.#cleanupRovingTabIndex = createRovingTabIndex2(this.#listElement, {
      direction: "horizontal",
      noMemory: true,
      selector: `${this.#settings.selector.list} > * > a`,
      wrap: true
    });
    this.#rootElement.setAttribute("data-path-initialized", "");
  }
  #onFocusIn = (event) => {
    if (!this.#autoOpen && !this.#hasOpenMenu()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const link = this.#linkElements.indexOf(target) >= 0 ? target : target.closest(this.#settings.selector.item)?.querySelector("a");
    if (!link) {
      return;
    }
    const menu = this.#bindings.get(link)?.menu;
    if (menu) {
      this.#autoOpen = true;
      menu.open();
      return;
    }
    this.#closeAllMenus();
  };
  #onFocusOut = (event) => {
    const target = event.relatedTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (!this.#rootElement.contains(target) && !this.#hasOpenMenu()) {
      this.#autoOpen = false;
    }
  };
  #onKeyDown = (event) => {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event;
    if (altKey || ctrlKey || metaKey || shiftKey) {
      return;
    }
    if (!["Tab", "Escape"].includes(key)) {
      return;
    }
    switch (key) {
      case "Tab": {
        event.preventDefault();
        this.#closeAllMenus();
        const next = getNextFocusable2();
        next instanceof HTMLElement && next.focus();
        break;
      }
      case "Escape":
        this.#autoOpen = false;
        break;
    }
  };
  #closeAllMenus() {
    this.#menus.filter((menu) => menu.isOpen()).forEach((menu) => {
      menu.close();
    });
  }
  #hasOpenMenu() {
    return this.#menus.some((menu) => menu.isOpen());
  }
  #mergeOptions(target, source) {
    return {
      ...target,
      ...source,
      animation: { ...target.animation, ...source.animation ?? {} },
      popover: {
        ...target.popover,
        ...source.popover ?? {},
        middleware: Object.assign(
          [...target.popover?.middleware ?? []],
          [...source.popover?.middleware ?? []]
        )
      },
      selector: {
        ...target.selector,
        ...source.selector ?? {},
        menu: { ...target.selector?.menu, ...source.selector?.menu ?? {} }
      }
    };
  }
};
function createBinding(link, menu) {
  return { link, menu };
}
/**
 * Path
 * Breadcrumb-style path bar implementation in TypeScript.
 * Supports keyboard navigation, integrated menus, and seamless menu traversal.
 *
 * @version 1.0.4
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/path}
 */
/*! Bundled license information:

@y14e/menu/dist/index.js:
  (**
   * Menu
   * WAI-ARIA compliant menu (menu button) pattern implementation in TypeScript.
   * Supports checkbox item, radio item, and infinitely nested menus.
   *
   * @version 1.7.4
   * @author Yusuke Kamiyamane
   * @license MIT
   * @copyright Copyright (c) Yusuke Kamiyamane
   * @see {@link https://github.com/y14e/menu}
   *)
  (*! Bundled license information:
  
  @y14e/attributes-utils/dist/index.js:
    (**
     * Attributes Utils
     *
     * @version 1.1.1
     * @author Yusuke Kamiyamane
     * @license MIT
     * @copyright Copyright (c) Yusuke Kamiyamane
     * @see {@link https://github.com/y14e/attributes-utils}
     *)
  
  @y14e/portal/dist/index.js:
    (**
     * Portal
     * Lightweight DOM portal (teleport) utility with fully focus management.
     * Designed for accessible dialogs, menus, overlays, popovers.
     *
     * @version 1.2.14
     * @author Yusuke Kamiyamane
     * @license MIT
     * @copyright Copyright (c) Yusuke Kamiyamane
     * @see {@link https://github.com/y14e/portal}
     *)
    (*! Bundled license information:
    
    @y14e/attributes-utils/dist/index.js:
      (**
       * Attributes Utils
       *
       * @version 1.1.1
       * @author Yusuke Kamiyamane
       * @license MIT
       * @copyright Copyright (c) Yusuke Kamiyamane
       * @see {@link https://github.com/y14e/attributes-utils}
       *)
    
    power-focusable/dist/index.js:
      (**
       * Power Focusable
       * High-precision focus management utility with full composed tree support.
       * Handles complex focus rules including tabindex ordering, radio groups, inert.
       *
       * @version 4.3.2
       * @author Yusuke Kamiyamane
       * @license MIT
       * @copyright Copyright (c) Yusuke Kamiyamane
       * @see {@link https://github.com/y14e/power-focusable}
       *)
    *)
  
  @y14e/roving-tabindex/dist/index.js:
    (**
     * Roving Tabindex
     * Lightweight roving tabindex utility with fully focus management.
     * Designed for accessible menus, tabs, toolbars, and composite widgets.
     *
     * @version 3.0.0
     * @author Yusuke Kamiyamane
     * @license MIT
     * @copyright Copyright (c) Yusuke Kamiyamane
     * @see {@link https://github.com/y14e/roving-tabindex}
     *)
    (*! Bundled license information:
    
    @y14e/attributes-utils/dist/index.js:
      (**
       * Attributes Utils
       *
       * @version 1.1.1
       * @author Yusuke Kamiyamane
       * @license MIT
       * @copyright Copyright (c) Yusuke Kamiyamane
       * @see {@link https://github.com/y14e/attributes-utils}
       *)
    
    power-focusable/dist/index.js:
      (**
       * Power Focusable
       * High-precision focus management utility with full composed tree support.
       * Handles complex focus rules including tabindex ordering, radio groups, inert.
       *
       * @version 4.3.2
       * @author Yusuke Kamiyamane
       * @license MIT
       * @copyright Copyright (c) Yusuke Kamiyamane
       * @see {@link https://github.com/y14e/power-focusable}
       *)
    *)
  *)

@y14e/roving-tabindex/dist/index.js:
  (**
   * Roving Tabindex
   * Lightweight roving tabindex utility with fully focus management.
   * Designed for accessible menus, tabs, toolbars, and composite widgets.
   *
   * @version 3.0.0
   * @author Yusuke Kamiyamane
   * @license MIT
   * @copyright Copyright (c) Yusuke Kamiyamane
   * @see {@link https://github.com/y14e/roving-tabindex}
   *)
  (*! Bundled license information:
  
  @y14e/attributes-utils/dist/index.js:
    (**
     * Attributes Utils
     *
     * @version 1.1.1
     * @author Yusuke Kamiyamane
     * @license MIT
     * @copyright Copyright (c) Yusuke Kamiyamane
     * @see {@link https://github.com/y14e/attributes-utils}
     *)
  
  power-focusable/dist/index.js:
    (**
     * Power Focusable
     * High-precision focus management utility with full composed tree support.
     * Handles complex focus rules including tabindex ordering, radio groups, inert.
     *
     * @version 4.3.2
     * @author Yusuke Kamiyamane
     * @license MIT
     * @copyright Copyright (c) Yusuke Kamiyamane
     * @see {@link https://github.com/y14e/power-focusable}
     *)
  *)

power-focusable/dist/index.js:
  (**
   * Power Focusable
   * High-precision focus management utility with full composed tree support.
   * Handles complex focus rules including tabindex ordering, radio groups, inert.
   *
   * @version 4.3.2
   * @author Yusuke Kamiyamane
   * @license MIT
   * @copyright Copyright (c) Yusuke Kamiyamane
   * @see {@link https://github.com/y14e/power-focusable}
   *)
*/

export { Path as default, flip2 as flip, offset2 as offset, shift2 as shift };
