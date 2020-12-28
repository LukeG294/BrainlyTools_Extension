import { Icon, Text } from "@style-guide";
import ActionButton from "./ActionButton";
import type QuickActionButtonsClassType from "../QuickActionButtons";

export default class VerifyButton extends ActionButton {
  constructor(main: QuickActionButtonsClassType) {
    super(
      main,
      "left",
      {
        type: "outline",
        toggle: "mint",
        iconOnly: true,
        title: System.data.locale.common.moderating.approve,
        icon: new Icon({
          size: 32,
          color: "mint",
          type: "verified",
        }),
      },
      Text({
        tag: "div",
        size: "small",
        weight: "bold",
        children: System.data.locale.common.moderating.approve,
      }),
    );

    // this.button.element.addEventListener("click", this.Clicked.bind(this));
  }

  /* async Clicked() {
    if (!("ConfirmApproving" in this.main.main)) return;

    await this.Selected();
    this.main.main.ConfirmApproving();
  } */
}
