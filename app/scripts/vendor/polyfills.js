// Polyfill for SVGGraphicsElement.getTransformToElement() function removed in Chrome 48
// Source: http://jointjs.com/blog/get-transform-to-element-polyfill.html
SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(toElement) {
    return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
};
