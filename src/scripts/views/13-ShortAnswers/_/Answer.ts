import Action, { RemoveAnswerReqDataType } from "@BrainlyAction";
import CreateElement from "@components/CreateElement";
import notification from "@components/notification2";
import HideElement from "@root/helpers/HideElement";
import { Button, Checkbox, Flex, Icon, Label, Spinner } from "@style-guide";
import type ShortAnswersClassType from "..";
import { AnswerAttachmentType } from "../answerAttachment.fragment";
import QuickDeleteButton from "./QuickDeleteButton";

export default class Answer {
  private main: ShortAnswersClassType;
  private rowElement: HTMLTableRowElement;

  private actionButtons: Button[];

  private author: {
    id: number;
    nick: string;
  };

  questionId: number;
  answerId: number;
  private moderateButtonContainer: HTMLTableDataCellElement;
  private moderateButton: Button;
  private quickDeleteButtonContainer: import("@style-guide/Flex").FlexElementType;
  #actionButtonSpinner: HTMLDivElement;
  private dateCell: HTMLTableCellElement;
  deleted: boolean;
  private deleting: boolean;
  private checkboxContainer?: HTMLTableDataCellElement;
  checkbox?: Checkbox;

  attachments: AnswerAttachmentType[];
  private contentCell: HTMLTableCellElement;

  constructor(main: ShortAnswersClassType, rowElement: HTMLTableRowElement) {
    this.main = main;
    this.rowElement = rowElement;

    this.actionButtons = [];

    this.FindAuthor();
    this.FindDateCell();
    this.FindQuestionId();
    this.FindAnswerId();
    this.FindContentCell();
    this.RenderModerateButton();
    this.RenderCheckbox();
    this.BindListener();
  }

  get actionButtonSpinner() {
    if (!this.#actionButtonSpinner) {
      this.RenderActionButtonSpinner();
    }

    return this.#actionButtonSpinner;
  }

  private RenderActionButtonSpinner() {
    this.#actionButtonSpinner = Spinner({ overlay: true });
  }

  private FindAuthor() {
    const authorProfileAnchor: HTMLAnchorElement = this.rowElement.querySelector(
      `td:nth-child(3) > a`,
    );

    if (!authorProfileAnchor) {
      throw Error("Can't find author anchor");
    }

    this.author = {
      id: System.ExtractId(authorProfileAnchor.href),
      nick: authorProfileAnchor.innerText.trim(),
    };
  }

  private FindDateCell() {
    this.dateCell = this.rowElement.querySelector("td.last");

    if (!this.dateCell) {
      throw Error("Can't find answers date cell");
    }

    this.dateCell.classList.remove("last");
    this.dateCell.classList.add("ext-qdb-cell");
  }

  private FindQuestionId() {
    const questionLink: HTMLAnchorElement = this.rowElement.querySelector(
      `td:nth-child(2) > a`,
    );

    this.questionId = System.ExtractId(questionLink.innerText);

    if (Number.isNaN(this.questionId) || !this.questionId)
      throw Error("Can't find question id");
  }

  private FindAnswerId() {
    const correctLink: HTMLAnchorElement = this.rowElement.querySelector(
      `a[id^="correct"]`,
    );

    this.answerId = System.ExtractId(correctLink.id);

    if (Number.isNaN(this.answerId) || !this.answerId)
      throw Error("Can't find answer id");
  }

  private FindContentCell() {
    this.contentCell = this.rowElement.querySelector("td:nth-child(4)");

    if (!this.contentCell) {
      throw Error("Can't find answer's content cell");
    }
  }

  private RenderModerateButton() {
    this.moderateButtonContainer = CreateElement({
      tag: "td",
      className: "last",
      children: this.moderateButton = new Button({
        size: "s",
        type: "solid-blue",
        iconOnly: true,
        icon: new Icon({
          type: "pencil",
        }),
        onClick: this.Moderate.bind(this),
      }),
    });

    this.actionButtons.push(this.moderateButton);
    this.rowElement.append(this.moderateButtonContainer);
  }

  async Moderate() {
    this.moderateButton.Disable();

    const ticketData = await this.main.moderatePanelController.Moderate(this);

    this.moderateButton.Enable();

    return ticketData;
  }

  private RenderCheckbox() {
    if (!System.checkUserP(15)) return;

    this.checkboxContainer = CreateElement({
      tag: "td",
      children: this.checkbox = new Checkbox({
        id: null,
      }),
    });

    this.rowElement.prepend(this.checkboxContainer);
  }

  private BindListener() {
    if (!System.checkUserP(2)) return;

    this.rowElement.addEventListener(
      "mouseenter",
      this.ShowQuickDeleteButtons.bind(this),
    );
    this.rowElement.addEventListener(
      "mouseleave",
      this.HideQuickDeleteButtons.bind(this),
    );
  }

  private ShowQuickDeleteButtons() {
    if (this.deleted) return;

    if (!this.quickDeleteButtonContainer) {
      this.RenderQuickDeleteButtons();
    }

    this.dateCell.append(this.quickDeleteButtonContainer);
  }

  private HideQuickDeleteButtons() {
    if (this.deleting) return;

    HideElement(this.quickDeleteButtonContainer);
  }

  private RenderQuickDeleteButtons() {
    this.quickDeleteButtonContainer = Flex({
      className: "ext-qdb-container",
    });

    System.data.config.quickDeleteButtonsReasons.answer.forEach(
      (reasonId, index) => {
        const reason = System.DeleteReason({ id: reasonId, type: "answer" });

        if (!reason) return;

        const qdb = new QuickDeleteButton(
          this,
          { type: "solid-peach" },
          reason,
          index + 1,
        );

        this.actionButtons.push(qdb.button);
        this.quickDeleteButtonContainer.append(qdb.container);
      },
    );
  }

  async Delete(data: RemoveAnswerReqDataType) {
    try {
      this.DisableActionButtons();

      this.deleting = true;

      const res = await new Action().RemoveAnswer({
        ...data,
        model_id: this.answerId,
      });
      // console.log({
      //   ...data,
      //   model_id: this.answerId,
      // });
      // await System.TestDelay();
      // const res = { success: true, message: "Failed" };

      new Action().CloseModerationTicket(this.answerId);

      if (!res) {
        throw Error("No response");
      }

      if (res.success === false) {
        throw res?.message ? { msg: res?.message } : res;
      }

      this.Deleted();

      System.log(6, {
        user: {
          id: this.author.id,
          nick: this.author.nick,
        },
        data: [this.answerId],
      });
    } catch (error) {
      console.error(error);
      notification({
        type: "error",
        html:
          error.msg ||
          System.data.locale.common.notificationMessages.somethingWentWrong,
      });
    }

    this.deleting = false;

    this.HideActionButtonSpinner();
    this.EnableActionButtons();
  }

  private DisableActionButtons() {
    this.actionButtons.forEach(button => button.Disable());
  }

  private EnableActionButtons() {
    this.actionButtons.forEach(button => button.Enable());
  }

  private HideActionButtonSpinner() {
    if (!this.#actionButtonSpinner) return;

    HideElement(this.#actionButtonSpinner);
  }

  Deleted() {
    this.deleted = true;

    if (this.checkbox) {
      this.checkbox.input.disabled = true;
    }

    this.rowElement.classList.add("deleted");
    this.moderateButton.element.remove();
    this.quickDeleteButtonContainer?.remove();
  }

  RenderAttachmentIcon() {
    const attachmentContainer = Flex({
      marginBottom: "xxs",
      children: new Label({
        color: "gray",
        icon: new Icon({
          type: "attachment",
        }),
        children: this.attachments.length,
      }),
    });

    this.contentCell.prepend(attachmentContainer);
  }
}
