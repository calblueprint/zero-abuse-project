"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import styled from "styled-components";
import ZapLogo from "@/assets/images/zap-logo.jpg";
import COLORS from "@/styles/colors";

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${COLORS.surface};
  color: ${COLORS.ink};
`;

const Accent = styled.div`
  height: 4px;
  flex: none;
  background: ${COLORS.navy};
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 72px;
    background: ${COLORS.yellow};
  }
`;

const Stage = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
`;

const Column = styled.div`
  width: min(360px, 100%);
`;

const LogoWrap = styled.div`
  margin-bottom: 32px;
`;

export function AuthShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Shell className={className}>
      <Accent />
      <Stage>
        <Column>
          <LogoWrap>
            <Image
              src={ZapLogo}
              alt="Zero Abuse Project"
              width={236}
              height={68}
              preload
              style={{
                width: 236,
                height: 68,
                objectFit: "contain",
                objectPosition: "left center",
              }}
            />
          </LogoWrap>
          {children}
        </Column>
      </Stage>
    </Shell>
  );
}
