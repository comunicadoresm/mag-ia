import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface MagicLinkEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const MagicLinkEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: MagicLinkEmailProps) => {
  const magicLinkUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`

  return (
    <Html>
      <Head />
      <Preview>Link de Acesso da Magnetic.IA</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={logoSection}>
            <Img
              src="https://myuwlvvmbxpeikjuejxy.supabase.co/storage/v1/object/public/email-assets/logo-symbol.png?v=1"
              alt="Magnetic.IA"
              width="60"
              height="60"
              style={logoImage}
            />
            <Text style={logoText}>Magnetic.IA</Text>
          </Section>

          {/* Main Content */}
          <Section style={contentSection}>
            <Heading style={heading}>Link de Acesso</Heading>
            
            <Text style={greeting}>
              Magnético, o seu link chegou!
            </Text>
            
            <Text style={description}>
              Clique no botão abaixo para acessar a Magnetic.IA
            </Text>

            {/* CTA Button */}
            <Section style={buttonSection}>
              <Link href={magicLinkUrl} target="_blank" style={button}>
                Acessar
              </Link>
            </Section>

            {/* OTP Code */}
            <Text style={orText}>ou use o código abaixo:</Text>
            <Section style={codeSection}>
              <Text style={code}>{token}</Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Se você não solicitou este acesso, pode ignorar este email com segurança.
            </Text>
            <Text style={footerBrand}>
              Comunicadores Magnéticos
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail

// Styles matching Magnetic.IA brand
const main = {
  backgroundColor: '#1a1a1a',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '480px',
}

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logoImage = {
  margin: '0 auto',
  borderRadius: '12px',
}

const logoText = {
  color: '#FAFC59',
  fontSize: '24px',
  fontWeight: '700',
  margin: '12px 0 0 0',
  letterSpacing: '-0.5px',
}

const contentSection = {
  backgroundColor: '#242424',
  borderRadius: '16px',
  border: '1px solid rgba(250, 252, 89, 0.2)',
  padding: '32px 24px',
  textAlign: 'center' as const,
}

const heading = {
  color: '#FAFC59',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 24px 0',
  letterSpacing: '-0.5px',
}

const greeting = {
  color: '#fafafa',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}

const description = {
  color: '#999999',
  fontSize: '16px',
  margin: '0 0 32px 0',
  lineHeight: '24px',
}

const buttonSection = {
  marginBottom: '24px',
}

const button = {
  backgroundColor: '#FAFC59',
  color: '#141414',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  padding: '14px 48px',
  borderRadius: '9999px',
  display: 'inline-block',
  boxShadow: '0 0 24px -4px rgba(250, 252, 89, 0.4)',
}

const orText = {
  color: '#666666',
  fontSize: '14px',
  margin: '0 0 16px 0',
}

const codeSection = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: '16px',
  border: '1px solid rgba(250, 252, 89, 0.1)',
}

const code = {
  color: '#FAFC59',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '8px',
  margin: '0',
  fontFamily: 'monospace',
}

const footer = {
  marginTop: '32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#666666',
  fontSize: '13px',
  margin: '0 0 16px 0',
  lineHeight: '20px',
}

const footerBrand = {
  color: '#FAFC59',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
}
