import Action from "@BrainlyAction";
import type { ModeratorDataType } from "@BrainlyReq/LiveModerationFeed";
import CreateElement from "@components/CreateElement";
import notification from "@components/notification2";
import { DeleteReasonSubCategoryType } from "@root/controllers/System";
import HideElement from "@root/helpers/HideElement";
import InsertAfter from "@root/helpers/InsertAfter";
import WaitForElement from "@root/helpers/WaitForElement";
import { Avatar, Button, Flex, Icon, Text } from "@style-guide";
import type { FlexElementType } from "@style-guide/Flex";
import Hammer from "hammerjs";
import tippy from "tippy.js";
import type QuestionPageClassType from "./QuestionPage";
import QuickDeleteButton from "./QuickDeleteButton";

export default class QuestionSection {
  main: QuestionPageClassType;

  searchingForModerationBox: boolean;
  moderationBox: HTMLDivElement;
  moderateButton: HTMLButtonElement;
  questionBox: HTMLDivElement;
  newModerateButton: Button;
  quickActionButtonContainer: FlexElementType;
  actionButtons: Button[];
  confirmButtonContainer: FlexElementType;
  confirmButton: Button;
  moderatorInfoContainer?: FlexElementType;

  constructor(main: QuestionPageClassType) {
    this.main = main;
    this.actionButtons = [];

    this.Init();
  }

  get approvedAnswers() {
    return this.main.data.responses.filter(
      answerData => answerData.approved.approver,
    );
  }

  async Init(showError?: boolean) {
    if (this.searchingForModerationBox) return;

    await this.FindModerationBox(showError);
    this.FindQuestionContainer();

    if (!this.moderationBox) return;

    this.FindModerateButton();
    this.ReplaceModerateButtonWithNew();
    this.RenderQuickActionButtons();
    this.RenderConfirmButton();
  }

  async FindModerationBox(showError: boolean) {
    this.searchingForModerationBox = true;

    try {
      this.moderationBox = (await WaitForElement(
        ":scope > div > .sg-box > .sg-flex",
        { parent: this.main.questionContainer, noError: showError },
      )) as HTMLDivElement;
    } catch (error) {
      console.error(error);
    }

    this.searchingForModerationBox = false;
  }

  FindQuestionContainer() {
    this.questionBox = this.main.questionContainer.querySelector(
      ":scope > div > .brn-qpage-next-question-box",
    );

    if (!this.questionBox) {
      throw Error("Can't find the question box");
    }
  }

  FindModerateButton() {
    this.moderateButton = this.moderationBox.querySelector(":scope > button");

    if (!this.moderateButton) {
      throw Error("Can't find the question's moderate button");
    }
  }

  ReplaceModerateButtonWithNew() {
    if (!this.main.moderatePanelController) return;

    this.newModerateButton = new Button({
      size: "s",
      type: "solid-blue",
      icon: new Icon({
        size: 16,
        type: "ext-shield",
      }),
      children: this.moderateButton.lastElementChild.innerHTML,
      onClick: this.OpenModeratePanel.bind(this),
      onContextMenu: event => {
        if (!document.documentElement.classList.contains("mobile")) return;

        event.preventDefault();
      },
    });

    const hammer = new Hammer.Manager(this.newModerateButton.element);
    const Press = new Hammer.Press({
      time: 500,
    });

    hammer.add(Press);
    hammer.on("press", () => {
      this.moderateButton.click();
    });

    this.moderationBox.prepend(this.newModerateButton.element);
    this.moderateButton.classList.add("js-hidden");
  }

  OpenModeratePanel(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      this.moderateButton.click();

      return;
    }

    this.main.moderatePanelController.Moderate();
  }

  RenderQuickActionButtons() {
    this.quickActionButtonContainer = Flex({
      wrap: true,
    });

    InsertAfter(
      this.quickActionButtonContainer,
      this.moderationBox.firstElementChild,
    );

    if (this.approvedAnswers.length > 0) return;

    System.data.config.quickDeleteButtonsReasons.question.forEach(
      (reasonId, index) => {
        const reason = System.DeleteReason({ id: reasonId, type: "question" });

        if (!reason) return;

        const qdb = new QuickDeleteButton(
          this,
          { type: "solid-mustard" },
          reason,
          index + 1,
        );

        this.actionButtons.push(qdb.button);
        this.quickActionButtonContainer.append(qdb.container);
      },
    );
  }

  RenderConfirmButton() {
    if (!this.main.data.isMarkedAbuse) return;

    this.confirmButtonContainer = Flex({
      children: (this.confirmButton = new Button({
        size: "s",
        type: "solid-mint",
        iconOnly: true,
        icon: new Icon({
          type: "check",
          color: "light",
        }),
        onClick: this.Confirm.bind(this),
      })),
    });

    tippy(this.confirmButton.element, {
      content: Text({
        size: "small",
        weight: "bold",
        children: System.data.locale.common.confirm,
      }),
      theme: "light",
    });

    this.quickActionButtonContainer.append(this.confirmButtonContainer);
  }

  async Confirm() {
    if (
      !confirm(
        System.data.locale.userContent.notificationMessages
          .doYouWantToConfirmThisContent,
      )
    )
      return;

    this.confirmButtonContainer.append(this.main.actionButtonSpinner);
    this.DisableActionButtons();

    try {
      const resConfirm = await new Action().ConfirmQuestion(this.main.data.id);

      if (!resConfirm) {
        throw Error("No response");
      }

      if (resConfirm.success === false) {
        throw resConfirm.message
          ? { msg: resConfirm.message }
          : resConfirm || Error("No response");
      }

      this.Confirmed();
    } catch (error) {
      console.error(error);
      notification({
        type: "error",
        html:
          error.msg ||
          System.data.locale.common.notificationMessages.somethingWentWrong,
      });
    }

    this.EnableActionButtons();
  }

  Confirmed() {
    HideElement(this.confirmButtonContainer);
    this.questionBox.classList.add("brn-content--confirmed");
    System.log(19, {
      user: window.jsData.question.author,
      data: [window.jsData.question.databaseId],
    });
  }

  async Delete(reason: DeleteReasonSubCategoryType) {
    try {
      this.DisableActionButtons();

      const giveWarning = System.canBeWarned(reason.id);
      const taskData = {
        model_id: this.main.data.id,
        reason_id: reason.category_id,
        reason: reason.text,
        reason_title: reason.title,
        give_warning: giveWarning,
        take_points: true,
        return_points: false,
      };

      // console.log(taskData);
      // const res = { success: true, message: "Failed" };
      // await System.TestDelay();

      const res = await new Action().RemoveQuestion(taskData);

      new Action().CloseModerationTicket(this.main.data.id);

      if (!res) {
        throw Error("No response");
      }

      if (res.success === false) {
        throw res?.message ? { msg: res?.message } : res;
      }

      this.Deleted();
    } catch (error) {
      console.error(error);
      notification({
        type: "error",
        html:
          error.msg ||
          System.data.locale.common.notificationMessages.somethingWentWrong,
      });
    }

    this.EnableActionButtons();
    this.main.HideActionButtonSpinner();
  }

  Deleted() {
    this.questionBox.classList.add("brn-content--deleted");
    this.quickActionButtonContainer?.remove();

    this.main.answerSections.all.forEach(answerSection =>
      answerSection.Deleted(),
    );

    const userData = window.jsData.question.author;

    System.log(5, { user: userData, data: [this.main.data.id] });

    const options = this.questionBox.querySelector(
      ".brn-qpage-next-question-box__options",
    );

    if (options instanceof HTMLElement) {
      options.remove();
    }
  }

  DisableActionButtons() {
    this.actionButtons.forEach(button => button.Disable());
  }

  EnableActionButtons() {
    this.actionButtons.forEach(button => button.Enable());
  }

  TicketReserved(moderator: ModeratorDataType) {
    if (!this.moderatorInfoContainer) {
      this.RenderModeratorInfoContainer();
    } else {
      this.moderatorInfoContainer.innerHTML = "";
    }

    const nickText = Text({
      weight: "bold",
      size: "small",
      children: moderator.nick,
    });

    const avatarContainer = Flex({
      relative: true,
      marginLeft: "xs",
      children: [
        new Avatar({
          size: "xs",
          imgSrc: moderator?.avatar,
          title: moderator.nick,
          alt: moderator.nick,
        }),
        CreateElement({
          tag: "div",
          className: "brn-answering-user__dot-container",
          children: new Icon({
            size: 24,
            color: "blue",
            type: "ext-shield",
          }),
        }),
      ],
    });

    this.moderatorInfoContainer.append(nickText, avatarContainer);
  }

  RenderModeratorInfoContainer() {
    this.moderatorInfoContainer = Flex({
      tag: "div",
      marginTop: "xxs",
      marginRight: "xs",
      alignItems: "center",
      className: "brn-feed-item__moderator-info",
    });

    InsertAfter(
      this.moderatorInfoContainer,
      this.moderationBox.firstElementChild,
    );
  }
}
