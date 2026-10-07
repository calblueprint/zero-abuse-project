import Link from "next/link";
import styled from "styled-components";
import COLORS from "@/styles/colors";
import { Box } from "@/styles/containers";
import { H1, P1, P3 } from "@/styles/text";

interface ProfileViewProps {
  accessLevel: "Admin" | "Member";
  name: string;
  email: string;
  phone: string;
  organization: string;
  pendingEmail: string | null;
}

export default function ProfileView({
  accessLevel,
  name,
  email,
  phone,
  organization,
  pendingEmail,
}: ProfileViewProps) {
  return (
    <Page>
      <Box $maxW="1000px" $mx="auto" $h="auto">
        <H1 $color={COLORS.navy} $fontWeight={700}>
          My profile
        </H1>
        <Card>
          <Row $divider>
            <Label>Access level</Label>
            <Value>{accessLevel}</Value>
          </Row>
          <Row>
            <Label>Name</Label>
            <Value>{name}</Value>
          </Row>
          <Row>
            <Label>Work email</Label>
            <div>
              <Value>{email}</Value>
              {pendingEmail && (
                <P3 $color={COLORS.gray}>
                  Change to <strong>{pendingEmail}</strong> is pending
                  verification. Check your inbox to confirm.
                </P3>
              )}
            </div>
          </Row>
          <Row>
            <Label>Phone</Label>
            <Value>{phone || "—"}</Value>
          </Row>
          <Row>
            <Label>Organization</Label>
            <Value>{organization}</Value>
          </Row>
          <EditLink href="/profile/edit">Edit profile</EditLink>
        </Card>
      </Box>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100vh;
  padding: 72px 24px;
  background: ${COLORS.background};
`;

const Card = styled.section`
  margin-top: 24px;
  padding: 24px 50px 30px 35px;
  background: ${COLORS.surface};
  border: 1px solid ${COLORS.border};
  border-radius: 8px;

  @media (max-width: 600px) {
    padding: 16px 20px 24px;
  }
`;

const Row = styled.div<{ $divider?: boolean }>`
  display: grid;
  grid-template-columns: 280px 1fr;
  align-items: center;
  padding: 24px 0;
  border-bottom: ${({ $divider }) =>
    $divider ? `1px solid ${COLORS.border}` : "none"};
  margin-bottom: ${({ $divider }) => ($divider ? "8px" : "0")};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 16px 0;
  }
`;

const Label = styled(P1)`
  color: ${COLORS.gray};
`;

const Value = styled(P1)`
  color: ${COLORS.ink};
  font-weight: 500;
  overflow-wrap: anywhere;
`;

const EditLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 436px;
  height: 56px;
  margin-top: 8px;
  border-radius: 8px;
  background: ${COLORS.navy};
  color: ${COLORS.surface};
  font-size: 1rem;
  font-weight: 400;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid ${COLORS.navy};
    outline-offset: 2px;
  }
`;
