/* eslint-disable no-param-reassign */

import type { Icon, Button, Select } from "@style-guide";

export type ChildrenParamType =
  | string
  | number
  | boolean
  | Text
  | Element
  | HTMLElement
  | HTMLElementTagNameMap[keyof HTMLElementTagNameMap]
  | DocumentFragment
  | Node
  | Icon
  | Button
  | Select
  | { element: ChildrenParamType }
  | (() => ChildrenParamType)
  | ChildrenParamType[]
  | null;

function appendChildren(
  target: HTMLElement | Element,
  _children: ChildrenParamType,
) {
  let children = _children;

  if (!target || children === undefined || children === null) return;

  if (typeof children === "function") {
    children = children();
  }

  if (children instanceof Array) {
    if (children.length > 0)
      children.forEach(__children => appendChildren(target, __children));

    return;
  }

  if (
    typeof children !== "string" &&
    !(children instanceof Node) &&
    children !== undefined &&
    children !== null &&
    !(children instanceof HTMLElement) &&
    !(children instanceof Array) &&
    typeof children === "object" &&
    children.element !== undefined &&
    children.element !== null
  )
    children = children.element;

  if (
    typeof children === "string" ||
    typeof children === "number" ||
    typeof children === "boolean"
  )
    target.insertAdjacentHTML("beforeend", String(children));
  else if (
    children instanceof Text ||
    children instanceof Element ||
    children instanceof HTMLElement ||
    children instanceof DocumentFragment ||
    children instanceof Node
  )
    target.append(children);
  else {
    console.error("Unsupported children", children);
  }
}

export default function AddChildren(
  target: HTMLElement | Element,
  children?: ChildrenParamType,
) {
  if (!target || children === undefined || children === null) return;

  /* if (children instanceof Array) {
    if (children.length > 0)
      children.forEach(_children => appendChildren(target, _children));

    return;
  } */

  appendChildren(target, children);
}
