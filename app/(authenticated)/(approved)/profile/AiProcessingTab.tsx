"use client";

import { useId, useState } from "react";
import styled from "styled-components";
import COLORS from "@/styles/colors";
import { SoftButton, Tag, TextButton } from "@/styles/controls";
import {
  Actions,
  FieldInput,
  Hint,
  InfoLabel,
  InfoList,
  InfoRow,
  InfoValue,
  Section,
  SectionHead,
  SectionTitle,
} from "./styles";

type Mode = "zap" | "api-key" | "local";

const MODES: Record<Mode, { label: string; hint: string }> = {
  zap: { label: "ZAP servers", hint: "Requests run on ZAP's servers." },
  "api-key": {
    label: "API key",
    hint: "Your provider bills you for requests.",
  },
  local: { label: "Local inference", hint: "Requests run on your laptop." },
};

// TODO: Save through lib/llm/provider-connections.ts (nataliia/per-user-config-storage) once it lands.
export default function AiProcessingTab({ isAdmin }: { isAdmin: boolean }) {
  const modes: Mode[] = isAdmin ? ["zap", "local"] : ["api-key", "local"];
  const [mode, setMode] = useState<Mode>(modes[0]);
  const [formKey, setFormKey] = useState(0);
  const id = useId();
  const titleId = `${id}-title`;
  const fieldId = (name: string) => `${id}-${name}`;

  return (
    <Section>
      <SectionHead>
        <TitleLine>
          <SectionTitle id={titleId}>Where requests run</SectionTitle>
          {!isAdmin && (
            <Tag $tint={COLORS.reviewTint} $text={COLORS.reviewText}>
              Required
            </Tag>
          )}
        </TitleLine>
      </SectionHead>
      <Form
        key={formKey}
        aria-labelledby={titleId}
        onSubmit={event => event.preventDefault()}
      >
        <Segments role="radiogroup" aria-labelledby={titleId}>
          {modes.map(option => (
            <Segment key={option} $selected={option === mode}>
              <input
                type="radio"
                name="mode"
                value={option}
                checked={option === mode}
                onChange={() => setMode(option)}
              />
              {MODES[option].label}
            </Segment>
          ))}
        </Segments>
        <Hint>{MODES[mode].hint}</Hint>
        {mode !== "zap" && (
          <InfoList as="div">
            {mode === "api-key" ? (
              <InfoRow>
                <InfoLabel as="label" htmlFor={fieldId("api-key")}>
                  API key
                </InfoLabel>
                <InfoValue as="div">
                  <Input
                    id={fieldId("api-key")}
                    name="apiKey"
                    type="password"
                    placeholder="Paste your API key"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </InfoValue>
              </InfoRow>
            ) : (
              <>
                <InfoRow>
                  <InfoLabel as="label" htmlFor={fieldId("server")}>
                    Server address
                  </InfoLabel>
                  <InfoValue as="div">
                    <Input
                      id={fieldId("server")}
                      name="serverAddress"
                      type="url"
                      inputMode="url"
                      placeholder="http://localhost:11434"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel as="label" htmlFor={fieldId("model")}>
                    Model
                  </InfoLabel>
                  <InfoValue as="div">
                    <Input
                      id={fieldId("model")}
                      name="model"
                      placeholder="llama-3.1-8b-instruct"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </InfoValue>
                </InfoRow>
              </>
            )}
          </InfoList>
        )}
        <Footer>
          <Actions>
            <TextButton
              type="button"
              onClick={() => {
                setMode(modes[0]);
                setFormKey(key => key + 1);
              }}
            >
              Cancel
            </TextButton>
            <SoftButton
              type="submit"
              disabled
              aria-describedby={fieldId("unavailable")}
            >
              Save changes
            </SoftButton>
          </Actions>
        </Footer>
      </Form>
    </Section>
  );
}

const TitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const Segments = styled.div`
  display: flex;
  width: fit-content;
  max-width: 100%;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: ${COLORS.segmentTrack};
`;

const Segment = styled.label<{ $selected: boolean }>`
  position: relative;
  padding: 7px 14px;
  border-radius: 10px;
  background: ${({ $selected }) =>
    $selected ? COLORS.fieldFill : "transparent"};
  box-shadow: ${({ $selected }) =>
    $selected ? "0 1px 3px rgba(15, 27, 45, 0.06)" : "none"};
  color: ${({ $selected }) =>
    $selected ? COLORS.inkText : COLORS.secondaryText};
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? 500 : 400)};
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;

  input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  &:has(input:focus-visible) {
    outline: 2px solid ${COLORS.actionNavy};
    outline-offset: 1px;
  }
`;

const Input = styled(FieldInput)`
  width: 420px;
  max-width: 100%;
`;

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px 16px;
`;
