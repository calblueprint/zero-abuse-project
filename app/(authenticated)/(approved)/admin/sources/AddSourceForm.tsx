"use client";

import type { SourceFormState } from "./validation";
import { startTransition, useActionState, useId, useRef } from "react";
import styled from "styled-components";
import SelectMenu, { fieldBox } from "@/components/SelectMenu";
import COLORS from "@/styles/colors";
import { addSource } from "./actions";
import { PrimaryButton, SecondaryButton, TextButton } from "./styles";
import {
  parseSourceFormData,
  SOURCE_TIERS,
  SOURCE_TYPES,
  TIER_DESCRIPTIONS,
} from "./validation";

type AddSourceFormProps = {
  onCancel: () => void;
  onSaved: (status: NonNullable<SourceFormState["status"]>) => void;
};

const initialState: SourceFormState = {};

const TIER_OPTIONS = SOURCE_TIERS.map(tier => ({
  value: tier,
  label: `Tier ${tier}`,
  description: TIER_DESCRIPTIONS[tier],
}));

const TYPE_OPTIONS = SOURCE_TYPES.map(type => ({ value: type, label: type }));

export default function AddSourceForm({
  onCancel,
  onSaved,
}: AddSourceFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (
      previousState: SourceFormState,
      formData: FormData,
    ): Promise<SourceFormState> => {
      let result: SourceFormState;
      try {
        result = await addSource(previousState, formData);
      } catch {
        // The request itself failed. Keep what was typed, since React
        // resets the form after the action.
        return {
          fields: parseSourceFormData(formData).fields,
          message: "Something went wrong. Please try again.",
        };
      }
      const { status } = result;

      if (status) {
        // After an await, updates need their own transition to land
        // together with the refreshed rows.
        startTransition(() => onSaved(status));
      }

      return result;
    },
    initialState,
  );
  const id = useId();
  const submitRef = useRef<HTMLButtonElement>(null);
  const fieldId = (field: string) => `${id}-${field}`;
  const errorId = (field: keyof NonNullable<SourceFormState["errors"]>) =>
    state.errors?.[field] ? fieldId(`${field}-error`) : undefined;

  return (
    <Form
      action={formAction}
      // Enter in a field submits with "Add source". Otherwise the browser
      // picks the first submit button, which is "Reactivate it" when the
      // inactive-source prompt is showing.
      onKeyDown={event => {
        if (
          event.key === "Enter" &&
          !event.nativeEvent.isComposing &&
          event.target instanceof HTMLInputElement
        ) {
          event.preventDefault();
          if (!isPending) {
            event.currentTarget.requestSubmit(submitRef.current);
          }
        }
      }}
    >
      <Field>
        <Label htmlFor={fieldId("name")}>Name</Label>
        <Input
          id={fieldId("name")}
          name="name"
          placeholder="Source name"
          defaultValue={state.fields?.name}
          maxLength={255}
          autoComplete="off"
          data-autofocus
          aria-invalid={Boolean(state.errors?.name) || undefined}
          aria-describedby={errorId("name")}
          $invalid={Boolean(state.errors?.name)}
        />
        {state.errors?.name && (
          <ErrorText id={errorId("name")}>{state.errors.name}</ErrorText>
        )}
      </Field>
      <Field>
        <Label htmlFor={fieldId("url")}>Website URL</Label>
        <Input
          id={fieldId("url")}
          name="url"
          placeholder="https://"
          defaultValue={state.fields?.url}
          inputMode="url"
          autoComplete="off"
          aria-invalid={Boolean(state.errors?.url) || undefined}
          aria-describedby={errorId("url")}
          $invalid={Boolean(state.errors?.url)}
        />
        {state.errors?.url && (
          <ErrorText id={errorId("url")}>{state.errors.url}</ErrorText>
        )}
      </Field>
      <Row>
        <Field>
          <Label id={fieldId("tier-label")} htmlFor={fieldId("tier")}>
            Tier
          </Label>
          <SelectMenu
            // Remount so the submitted choice survives an error.
            key={state.fields?.tier}
            id={fieldId("tier")}
            name="tier"
            placeholder="Choose a tier"
            options={TIER_OPTIONS}
            defaultValue={state.fields?.tier}
            aria-labelledby={fieldId("tier-label")}
            aria-describedby={errorId("tier")}
            aria-invalid={Boolean(state.errors?.tier)}
          />
          {state.errors?.tier && (
            <ErrorText id={errorId("tier")}>{state.errors.tier}</ErrorText>
          )}
        </Field>
        <Field>
          <Label id={fieldId("type-label")} htmlFor={fieldId("type")}>
            Type
          </Label>
          <SelectMenu
            key={state.fields?.type}
            id={fieldId("type")}
            name="type"
            placeholder="Choose a type"
            options={TYPE_OPTIONS}
            defaultValue={state.fields?.type}
            aria-labelledby={fieldId("type-label")}
            aria-describedby={errorId("type")}
            aria-invalid={Boolean(state.errors?.type)}
          />
          {state.errors?.type && (
            <ErrorText id={errorId("type")}>{state.errors.type}</ErrorText>
          )}
        </Field>
      </Row>
      <Help>
        Tier sets how much ZAP trusts a source. Not sure? Start with Tier 2.
      </Help>
      {state.inactiveMatch && (
        <Callout>
          <CalloutText>
            This URL belongs to &ldquo;{state.inactiveMatch.name}&rdquo;, which
            is inactive.
          </CalloutText>
          <SecondaryButton
            type="submit"
            name="reactivateId"
            value={state.inactiveMatch.sourceId}
            disabled={isPending}
            $compact
          >
            Reactivate it
          </SecondaryButton>
        </Callout>
      )}
      {state.message && <ErrorText role="alert">{state.message}</ErrorText>}
      <Actions>
        <Hint>ZAP checks the source after you add it.</Hint>
        <TextButton type="button" onClick={onCancel}>
          Cancel
        </TextButton>
        <PrimaryButton ref={submitRef} type="submit" disabled={isPending}>
          Add source
        </PrimaryButton>
      </Actions>
    </Form>
  );
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Row = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 520px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const Field = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Label = styled.label`
  color: ${COLORS.inkText};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
`;

const Input = styled.input<{ $invalid?: boolean }>`
  width: 100%;
  background: ${COLORS.surface};
  color: ${COLORS.inkText};
  font: inherit;
  ${fieldBox}

  &::placeholder {
    color: ${COLORS.mutedText};
  }
`;

const ErrorText = styled.p`
  color: ${COLORS.error};
  font-size: 13px;
  line-height: 18px;
`;

const Help = styled.p`
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
`;

const Callout = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: ${COLORS.tintSoft};
`;

const CalloutText = styled.p`
  flex: 1;
  color: ${COLORS.secondaryText};
  font-size: 13px;
  line-height: 18px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Hint = styled.p`
  flex: 1;
  color: ${COLORS.mutedText};
  font-size: 13px;
  line-height: 18px;
`;
