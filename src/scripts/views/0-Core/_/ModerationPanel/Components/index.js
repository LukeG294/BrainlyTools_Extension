// @flow
import { MenuListItem } from "@/scripts/components/style-guide";
import HideElement from "@/scripts/helpers/HideElement";
import type { ChildrenParamType } from "@style-guide/helpers/AddChildren";
import type ModerationPanelType from "..";

export default class {
  main: ModerationPanelType;
  li: HTMLLIElement;
  liLink: HTMLElement;
  liLinkContent: ChildrenParamType;
  liContent: HTMLElement;

  HideElement: typeof HideElement;

  constructor(main: ModerationPanelType) {
    this.main = main;
    this.HideElement = HideElement;
  }

  RenderListItem() {
    this.li = MenuListItem({
      children: this.liLinkContent,
    });
    this.liLink = this.li.firstElementChild;

    this.li.setAttribute("style", "display: table; width: 100%;");
    this.main.ul.append(this.li);

    this.RenderLiContent();

    // @ts-ignore
    if (this.liContent) this.li.append(this.liContent);
  }

  // eslint-disable-next-line class-methods-use-this
  RenderLiContent() {}
}
