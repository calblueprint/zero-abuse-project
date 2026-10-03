from enum import Enum

class ExploitationType(str, Enum):
    FINANCIAL_SEXTORTION = "financial sextortion"
    AI_GENERATED_CSAM = "AI-generated CSAM"
    ONLINE_GROOMING = "online grooming"
    DEEPFAKE_ABUSE = "deepfake abuse"
    OFFENDER_NETWORKS = "offender networks"
    NIHILISTIC_VIOLENT_NETWORKS = "nihilistic violent networks"
    OTHER = "other"

class Platform(str, Enum):
    ROBLOX = "Roblox"
    DISCORD = "Discord"
    TELEGRAM = "Telegram"
    SNAPCHAT = "Snapchat"
    INSTAGRAM = "Instagram"
    OTHER = "other"

class Technology(str, Enum):
    GENERATIVE_AI = "generative AI"
    DEEPFAKES_SYNTHETIC_MEDIA = "deepfakes/synthetic media"
    CRYPTOCURRENCY = "cryptocurrency"
    ENCRYPTED_MESSAGING = "encrypted messaging"
    GAMING_PLATFORMS = "gaming platforms"
    SOCIAL_MEDIA = "social media"
    EMERGING_TECHNOLOGY = "emerging technology"
    OTHER = "other"

class AffectedPopulation(str, Enum):
    CHILDREN = "children"
    ADOLESCENTS = "adolescents"
    BOYS = "boys"
    GIRLS = "girls"
    MALE_SURVIVORS = "male survivors"
    OTHER = "other"

class OffenderTactic(str, Enum):
    GROOMING = "grooming"
    RECRUITMENT = "recruitment"
    COERCION = "coercion"
    THREATS = "threats"
    FINANCIAL_DEMANDS = "financial demands"
    IMPERSONATION = "impersonation"
    IMAGE_MANIPULATION = "image manipulation"
    PAYMENT_DEMANDS = "payment demands"
    NETWORKED_OFFENDING = "networked offending"
    OTHER = "other"

class IntelligenceType(str, Enum):
    RESEARCH_FINDING = "research finding"
    CASE_PROSECUTION = "case/prosecution"
    COURT_DECISION = "court decision"
    LEGISLATION = "legislation"
    POLICY_REGULATORY_CHANGE = "policy/regulatory change"
    PLATFORM_UPDATE = "platform update"
    SAFETY_UPDATE = "safety update"
    PROFESSIONAL_GUIDANCE = "professional guidance"
    OTHER = "other"
