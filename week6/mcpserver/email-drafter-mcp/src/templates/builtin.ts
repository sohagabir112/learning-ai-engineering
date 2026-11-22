import { EmailTemplate } from "../types.js";

const SEED_TIMESTAMP = "2025-01-01T00:00:00.000Z";

export const BUILTIN_TEMPLATES: EmailTemplate[] = [
  // ==========================================
  // TEACHER TEMPLATES (8 English + 3 Bangla)
  // ==========================================
  {
    id: "teacher-extension-request",
    name: "Assignment Extension Request",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Extension Request: {{course_name}} - {{assignment_name}}",
    body: `Dear {{recipient_name}},

I hope this email finds you well. I am a student in your {{course_name}} course, and I am writing to respectfully request a short extension on {{assignment_name}}, which is currently due on {{original_due_date}}.

Unfortunately, I am experiencing {{reason}}, which has impacted my ability to finalize the work on schedule. I have already completed {{progress_summary}} and would be very grateful if I could submit the finished assignment by {{new_due_date}}.

Thank you very much for your time, consideration, and understanding.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor or instructor name", required: true },
      { name: "course_name", description: "Course name or code", required: true },
      { name: "assignment_name", description: "Name of the assignment or project", required: true },
      {
        name: "original_due_date",
        description: "Original submission deadline",
        required: false,
        default: "the upcoming deadline",
      },
      {
        name: "reason",
        description: "Reason for requesting the extension",
        required: false,
        default: "an unexpected illness and scheduling conflict",
      },
      {
        name: "progress_summary",
        description: "What portion of the work is already done",
        required: false,
        default: "the core research and initial implementation",
      },
      { name: "new_due_date", description: "Proposed new deadline", required: true },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-absence-notice",
    name: "Class Absence / Leave Notice",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Absence Notification: {{course_name}} on {{absence_date}}",
    body: `Dear {{recipient_name}},

I am writing to inform you that I will be unable to attend our {{course_name}} class on {{absence_date}} due to {{reason}}.

I have arranged to review the lecture notes from a classmate and will complete any assigned readings or coursework on time. Please let me know if there are any specific announcements or materials I should cover before our next session.

Thank you for your understanding.

Sincerely,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor or instructor name", required: true },
      { name: "course_name", description: "Course name or code", required: true },
      { name: "absence_date", description: "Date(s) of absence", required: true },
      {
        name: "reason",
        description: "Reason for absence",
        required: false,
        default: "a medical appointment",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "formal",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-assignment-submission",
    name: "Assignment Submission Email",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Submission: {{assignment_name}} - {{course_name}} ({{sender_name}})",
    body: `Dear {{recipient_name}},

Please find attached my submission for {{assignment_name}} for {{course_name}}.

Submission Details:
- Title: {{assignment_name}}
- Submission Link / Attachment: {{submission_link}}
- Notes: {{submission_notes}}

Please let me know if you have any trouble accessing the files. Thank you for your time and guidance throughout this module.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor or instructor name", required: true },
      { name: "course_name", description: "Course name or code", required: true },
      { name: "assignment_name", description: "Name of the assignment", required: true },
      {
        name: "submission_link",
        description: "Link to repository/document or attachment file name",
        required: false,
        default: "Attached PDF and source code archive",
      },
      {
        name: "submission_notes",
        description: "Any extra remarks about the submission",
        required: false,
        default: "All required test cases pass as specified in the rubric.",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-grade-query",
    name: "Grade / Marks Inquiry",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Polite Inquiry Regarding {{assessment_name}} Grade - {{course_name}}",
    body: `Dear {{recipient_name}},

I hope you are having a productive week. I recently reviewed my feedback and grade for {{assessment_name}} in {{course_name}}, and I appreciate the comments provided.

I would like to kindly ask for clarification regarding {{specific_question}}. Understanding how my solution was evaluated on this section will help me improve for upcoming assessments. Would it be possible to briefly review this during your office hours or via email?

Thank you very much for your time and support.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor or TA name", required: true },
      { name: "course_name", description: "Course name or code", required: true },
      { name: "assessment_name", description: "Exam, quiz, or assignment name", required: true },
      {
        name: "specific_question",
        description: "Specific question or rubric item you are asking about",
        required: true,
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-clarification-question",
    name: "Course / Assignment Clarification Question",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Question Regarding {{topic}} - {{course_name}}",
    body: `Dear {{recipient_name}},

I hope this email finds you well. While reviewing the materials on {{topic}} for {{course_name}}, I had a quick question that I wanted to clarify.

Specifically, {{question_details}}. I have already checked the syllabus and lecture slides ({{attempted_understanding}}), and I wanted to confirm whether my understanding is on the right track.

Thank you in advance for your guidance.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor or instructor name", required: true },
      { name: "course_name", description: "Course name or code", required: true },
      { name: "topic", description: "Lecture topic or assignment section", required: true },
      { name: "question_details", description: "Your specific question", required: true },
      {
        name: "attempted_understanding",
        description: "What you already checked or your current interpretation",
        required: false,
        default: "Section 3 of the specification",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-recommendation-request",
    name: "Recommendation Letter Request",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Letter of Recommendation Request - {{sender_name}} ({{target_program}})",
    body: `Dear {{recipient_name}},

I hope you are doing well. I thoroughly enjoyed taking your {{course_name}} class, where I worked on {{highlight_work}}.

I am currently applying for {{target_program}}, and the application deadline is {{deadline}}. Given your mentorship and familiarity with my academic work, I am writing to ask if you would feel comfortable writing a strong letter of recommendation on my behalf.

If you are able to support my application, I would be happy to share my updated CV, transcript, and statement of purpose right away.

Thank you very much for considering my request.

Sincerely,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor name", required: true },
      { name: "course_name", description: "Course(s) taken with the professor", required: true },
      {
        name: "highlight_work",
        description: "Notable project, paper, or grade in their course",
        required: false,
        default: "the final capstone project",
      },
      {
        name: "target_program",
        description: "Graduate program, scholarship, or fellowship name",
        required: true,
      },
      { name: "deadline", description: "Submission deadline for the letter", required: true },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "formal",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-meeting-request",
    name: "Office Hours / Meeting Request",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Meeting Request: {{meeting_topic}} - {{course_name}}",
    body: `Dear {{recipient_name}},

I hope you are having a good week. I would like to schedule a brief {{duration}} meeting with you to discuss {{meeting_topic}} for {{course_name}}.

I am available during the following times:
- {{proposed_times}}

Please let me know if any of these slots work for you, or if another time during your office hours is more convenient.

Thank you for your time.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor or advisor name", required: true },
      {
        name: "course_name",
        description: "Course or thesis context",
        required: false,
        default: "Academic Advising",
      },
      { name: "meeting_topic", description: "Agenda or topic to discuss", required: true },
      { name: "proposed_times", description: "Your available dates/times", required: true },
      {
        name: "duration",
        description: "Expected length of meeting",
        required: false,
        default: "15-minute",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-thank-you",
    name: "Thank-You Email to Teacher / Professor",
    category: "teacher",
    audience: "teacher",
    language: "English",
    subject: "Thank You - {{course_name}}",
    body: `Dear {{recipient_name}},

I wanted to write and thank you sincerely for {{thank_you_reason}} in {{course_name}}.

Your guidance on {{specific_impact}} made a meaningful difference in my learning and confidence this semester. I truly appreciate the time and dedication you invest in your students.

Warm regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Professor or instructor name", required: true },
      { name: "course_name", description: "Course name", required: true },
      {
        name: "thank_you_reason",
        description: "What you are thanking the teacher for",
        required: true,
      },
      {
        name: "specific_impact",
        description: "Specific lesson, advice, or support that helped you",
        required: false,
        default: "our course project and career preparation",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },

  // Bangla Teacher Variants (3)
  {
    id: "teacher-extension-request-bn",
    name: "অ্যাসাইনমেন্ট জমার সময় বৃদ্ধির আবেদন (Bangla Extension Request)",
    category: "teacher",
    audience: "teacher",
    language: "Bangla",
    subject: "অ্যাসাইনমেন্ট জমার সময় বৃদ্ধির জন্য বিনীত আবেদন: {{course_name}} - {{assignment_name}}",
    body: `শ্রদ্ধেয় {{recipient_name}},

আশা করি ভালো আছেন। আমি আপনার {{course_name}} কোর্সের একজন শিক্ষার্থী। আমাদের {{assignment_name}} জমা দেওয়ার নির্ধারিত তারিখ ছিল {{original_due_date}}, কিন্তু {{reason}} কারণে আমি নির্ধারিত সময়ের মধ্যে কাজটি সম্পূর্ণ করতে পারিনি।

আমি ইতোমধ্যে {{progress_summary}} সম্পন্ন করেছি। আপনি যদি সদয় হয়ে আমাকে {{new_due_date}} পর্যন্ত সময় বৃদ্ধি করেন, তবে আমি সম্পূর্ণ কাজটি যথাযথভাবে জমা দিতে পারব।

অসুবিধার জন্য দুঃখিত। ধন্যবাদ।

বিনীত,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "শিক্ষকের নাম (Professor name)", required: true },
      { name: "course_name", description: "কোর্সের নাম (Course name)", required: true },
      { name: "assignment_name", description: "অ্যাসাইনমেন্টের নাম (Assignment name)", required: true },
      {
        name: "original_due_date",
        description: "পূর্বনির্ধারিত তারিখ (Original due date)",
        required: false,
        default: "নির্ধারিত সময়সীমা",
      },
      {
        name: "reason",
        description: "বিলম্বের কারণ (Reason for extension)",
        required: false,
        default: "শারীরিক অসুস্থতার",
      },
      {
        name: "progress_summary",
        description: "কাজের অগ্রগতি (Progress so far)",
        required: false,
        default: "অধিকাংশ কাজ",
      },
      { name: "new_due_date", description: "প্রস্তাবিত নতুন তারিখ (New due date)", required: true },
      {
        name: "sender_name",
        description: "আপনার নাম (Your name)",
        required: false,
        default: "আপনার নাম",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-absence-notice-bn",
    name: "ক্লাসে অনুপস্থিতির নোটিশ (Bangla Absence Notice)",
    category: "teacher",
    audience: "teacher",
    language: "Bangla",
    subject: "ক্লাসে অনুপস্থিতির জন্য অবহিতকরণ: {{course_name}} ({{absence_date}})",
    body: `শ্রদ্ধেয় {{recipient_name}},

আশা করি ভালো আছেন। সবিনয় নিবেদন এই যে, {{reason}} কারণে আমি আগামী {{absence_date}} তারিখে আপনার {{course_name}} ক্লাসে উপস্থিত থাকতে পারব না।

আমি সহপাঠীদের কাছ থেকে ওই দিনের ক্লাস নোট সংগ্রহ করে নেব এবং নির্ধারিত সময়ের মধ্যে সকল পাঠ ও কাজ সম্পন্ন করব। আপনার সদয় অবগতি ও অনুমতির জন্য অনুরোধ করছি।

ধন্যবাদ।

বিনীত,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "শিক্ষকের নাম (Professor name)", required: true },
      { name: "course_name", description: "কোর্সের নাম (Course name)", required: true },
      { name: "absence_date", description: "অনুপস্থিতির তারিখ (Absence date)", required: true },
      {
        name: "reason",
        description: "অনুপস্থিতির কারণ (Reason for absence)",
        required: false,
        default: "জরুরি চিকিৎসা সংক্রান্ত প্রয়োজনে",
      },
      {
        name: "sender_name",
        description: "আপনার নাম (Your name)",
        required: false,
        default: "আপনার নাম",
      },
    ],
    tone: "formal",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teacher-meeting-request-bn",
    name: "সাক্ষাতের সময় চেয়ে আবেদন (Bangla Meeting Request)",
    category: "teacher",
    audience: "teacher",
    language: "Bangla",
    subject: "সাক্ষাতের সময় চেয়ে আবেদন: {{meeting_topic}} ({{course_name}})",
    body: `শ্রদ্ধেয় {{recipient_name}},

আশা করি ভালো আছেন। {{course_name}} কোর্সের {{meeting_topic}} বিষয়ে আপনার পরামর্শ গ্রহণের জন্য আমি সংক্ষিপ্ত সময়ের জন্য আপনার সাথে সাক্ষাৎ করতে চাই।

আপনার সুবিধাজনক সময়ে—বিশেষ করে {{proposed_times}}—আপনার অফিস আওয়ারে সাক্ষাতের সুযোগ দিলে বিশেষভাবে উপকৃত হব। অনুগ্রহ করে আপনার সুবিধাজনক সময়টি দয়া করে জানান।

ধন্যবাদ।

বিনীত,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "শিক্ষকের নাম (Professor name)", required: true },
      {
        name: "course_name",
        description: "কোর্সের নাম বা প্রেক্ষাপট (Course name)",
        required: false,
        default: "একাডেমিক প্রজেক্ট",
      },
      { name: "meeting_topic", description: "আলোচনার বিষয় (Topic)", required: true },
      {
        name: "proposed_times",
        description: "সম্ভাব্য সময় (Proposed times)",
        required: true,
      },
      {
        name: "sender_name",
        description: "আপনার নাম (Your name)",
        required: false,
        default: "আপনার নাম",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },

  // ==========================================
  // CLIENT TEMPLATES (8)
  // ==========================================
  {
    id: "client-proposal-intro",
    name: "Project Proposal Introduction",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Proposal for {{project_name}} - Web Development & Implementation",
    body: `Dear {{recipient_name}},

Thank you for taking the time to discuss {{project_name}} with me. Based on our conversation, I have prepared a tailored proposal outlining how we can achieve {{project_goals}}.

Key Highlights of the Proposal:
- Scope & Deliverables: {{deliverables_summary}}
- Estimated Timeline: {{estimated_timeline}}
- Tech Stack & Approach: {{tech_stack}}

Please review the attached proposal at your convenience. I would be happy to hop on a quick call this week to walk through the milestones and answer any questions.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project or website name", required: true },
      {
        name: "project_goals",
        description: "Primary business goals of the project",
        required: true,
      },
      {
        name: "deliverables_summary",
        description: "Core deliverables included",
        required: true,
      },
      {
        name: "estimated_timeline",
        description: "Estimated project duration",
        required: false,
        default: "4-6 weeks",
      },
      {
        name: "tech_stack",
        description: "Proposed technical stack",
        required: false,
        default: "Next.js, TypeScript, Tailwind CSS, and PostgreSQL",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "client-quotation",
    name: "Project Quotation / Price Estimate",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Quotation & Cost Breakdown for {{project_name}}",
    body: `Dear {{recipient_name}},

Thank you for sharing the requirements for {{project_name}}. Below is the quotation and milestone breakdown for the requested web development work:

- Scope of Work: {{scope_summary}}
- Total Estimated Cost: {{total_price}}
- Payment Schedule: {{payment_terms}}
- Delivery Window: {{delivery_timeline}}

This quote is valid for {{validity_period}}. Once you confirm, I will send over the agreement and initial invoice so we can kick off development right away.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project name", required: true },
      { name: "scope_summary", description: "Summary of features covered", required: true },
      { name: "total_price", description: "Total quoted price with currency", required: true },
      {
        name: "payment_terms",
        description: "Deposit and milestone payment split",
        required: false,
        default: "50% upfront deposit, 50% upon final delivery",
      },
      {
        name: "delivery_timeline",
        description: "Expected completion timeframe",
        required: false,
        default: "3 weeks from kickoff",
      },
      {
        name: "validity_period",
        description: "How long the quote remains valid",
        required: false,
        default: "14 days",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "formal",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "client-project-update",
    name: "Client Project Progress Update",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Status Update: {{project_name}} ({{milestone_name}})",
    body: `Dear {{recipient_name}},

I hope you are having a great week. Here is the latest progress update on {{project_name}} for {{milestone_name}}:

Completed Since Last Update:
- {{completed_items}}

Currently In Progress:
- {{in_progress_items}}

Next Steps / Needed from You:
- {{next_steps}}

You can preview the latest staging build at {{staging_url}}. Please let me know if you have any feedback!

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project name", required: true },
      {
        name: "milestone_name",
        description: "Current sprint or milestone name",
        required: false,
        default: "Weekly Progress",
      },
      { name: "completed_items", description: "Features or tasks finished", required: true },
      { name: "in_progress_items", description: "Tasks currently being worked on", required: true },
      {
        name: "next_steps",
        description: "Upcoming work or items needed from client",
        required: false,
        default: "Finalizing QA testing before the next milestone review",
      },
      {
        name: "staging_url",
        description: "Preview URL or demo reference",
        required: false,
        default: "the shared staging environment",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "client-delay-notice",
    name: "Project Timeline / Delay Notice",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Timeline Update Regarding {{project_name}}",
    body: `Dear {{recipient_name}},

I am writing to give you an early update regarding the delivery schedule for {{project_name}}.

While working on {{affected_deliverable}}, we encountered {{delay_reason}}. To ensure we deliver a thoroughly tested and reliable build without compromising quality, I need to adjust our target delivery date from {{original_date}} to {{new_date}}.

Everything else on the roadmap remains on track, and I will send you a staging preview as soon as {{affected_deliverable}} is ready. Thank you for your patience.

With sincere apologies,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project name", required: true },
      {
        name: "affected_deliverable",
        description: "Feature or milestone impacted",
        required: false,
        default: "the current milestone",
      },
      {
        name: "delay_reason",
        description: "Reason for the schedule adjustment",
        required: false,
        default: "an unexpected third-party API integration issue",
      },
      {
        name: "original_date",
        description: "Previously scheduled date",
        required: false,
        default: "the original target date",
      },
      { name: "new_date", description: "New confirmed delivery date", required: true },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "apologetic",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "client-payment-reminder",
    name: "Invoice / Payment Reminder",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Payment Reminder: Invoice #{{invoice_number}} for {{project_name}}",
    body: `Dear {{recipient_name}},

I hope you are doing well. I am writing to follow up on Invoice #{{invoice_number}} for {{project_name}} in the amount of {{amount}}, which was due on {{due_date}}.

I have re-attached a copy of the invoice for your convenience. Payment can be completed via {{payment_method}}. If the transfer has already been initiated, please disregard this reminder.

Please let me know if you need any additional billing details from my side.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project name", required: true },
      { name: "invoice_number", description: "Invoice ID or reference number", required: true },
      { name: "amount", description: "Invoice amount with currency", required: true },
      { name: "due_date", description: "Invoice due date", required: true },
      {
        name: "payment_method",
        description: "Accepted payment method or link",
        required: false,
        default: "the bank transfer or payment link listed on the invoice",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "client-feedback-request",
    name: "Design / Deliverable Feedback Request",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Review & Feedback Requested: {{deliverable_name}} ({{project_name}})",
    body: `Dear {{recipient_name}},

I am pleased to share the latest version of {{deliverable_name}} for {{project_name}}. You can review it here: {{preview_link}}.

When reviewing, could you please pay special attention to:
- {{focus_areas}}

To keep our launch timeline on schedule, please share your consolidated feedback or approval by {{feedback_deadline}}.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project name", required: true },
      { name: "deliverable_name", description: "Name of the feature/page/design", required: true },
      { name: "preview_link", description: "Staging URL or Figma link", required: true },
      {
        name: "focus_areas",
        description: "Specific areas you want the client to check",
        required: false,
        default: "user flow, copy accuracy, and mobile responsiveness",
      },
      {
        name: "feedback_deadline",
        description: "Date by which feedback is needed",
        required: false,
        default: "this Friday",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "client-scope-change",
    name: "Scope Change / Change Request Assessment",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Scope Change Assessment: {{requested_feature}} for {{project_name}}",
    body: `Dear {{recipient_name}},

Thank you for sharing the details for adding {{requested_feature}} to {{project_name}}.

Because this item falls outside our original project scope, I have evaluated the additional engineering effort required:
- Additional Effort / Cost: {{additional_cost}}
- Timeline Impact: {{timeline_impact}}

Please let me know if you would like me to add {{requested_feature}} to the current milestone under this adjustment, or if you prefer to schedule it for Phase 2 after our initial launch.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project name", required: true },
      {
        name: "requested_feature",
        description: "New feature or change requested by client",
        required: true,
      },
      {
        name: "additional_cost",
        description: "Estimated additional cost or hours",
        required: true,
      },
      {
        name: "timeline_impact",
        description: "How many extra days/weeks it adds",
        required: true,
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "firm",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "client-project-handover",
    name: "Final Project Delivery & Handover",
    category: "client",
    audience: "client",
    language: "English",
    subject: "Final Delivery & Handover Package: {{project_name}}",
    body: `Dear {{recipient_name}},

I am delighted to announce that {{project_name}} is complete and deployed to production!

Here is your complete handover summary:
- Live Production URL: {{live_url}}
- Source Code & Documentation: {{repo_or_docs_link}}
- Admin / Credentials Handover: {{credentials_note}}
- Post-Launch Support Window: {{support_window}}

It has been a pleasure building {{project_name}} with you. Please review everything and let me know if you have any questions during your handover review.

Warm regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Client name", required: true },
      { name: "project_name", description: "Project name", required: true },
      { name: "live_url", description: "Production website URL", required: true },
      {
        name: "repo_or_docs_link",
        description: "GitHub repository or handover documentation link",
        required: true,
      },
      {
        name: "credentials_note",
        description: "How environment/admin credentials were shared",
        required: false,
        default: "Shared securely via 1Password / encrypted vault link",
      },
      {
        name: "support_window",
        description: "Bug-fix warranty period after launch",
        required: false,
        default: "14 days of complimentary post-launch bug support",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "friendly",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },

  // ==========================================
  // TEAMMATE TEMPLATES (7)
  // ==========================================
  {
    id: "teammate-task-update",
    name: "Task Status Update",
    category: "teammate",
    audience: "teammate",
    language: "English",
    subject: "Task Update: {{task_name}} ({{project_name}})",
    body: `Hi {{recipient_name}},

Quick update on {{task_name}} for {{project_name}}:

- Current Status: {{current_status}}
- Key Changes Made: {{changes_summary}}
- Next Step: {{next_step}}

Please let me know if this affects your part of the sprint or if we should sync briefly.

Best,
{{sender_name}}`,
    placeholders: [
      {
        name: "recipient_name",
        description: "Teammate name or 'Team'",
        required: false,
        default: "Team",
      },
      { name: "project_name", description: "Project or sprint name", required: true },
      { name: "task_name", description: "Feature, ticket, or task name", required: true },
      { name: "current_status", description: "Current status (e.g., Ready for QA)", required: true },
      { name: "changes_summary", description: "Summary of what was implemented", required: true },
      {
        name: "next_step",
        description: "Immediate next action",
        required: false,
        default: "Merging into main after review",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "concise",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teammate-meeting-invite",
    name: "Team Sync / Meeting Invite",
    category: "teammate",
    audience: "teammate",
    language: "English",
    subject: "Sync Invite: {{meeting_topic}} on {{meeting_time}}",
    body: `Hi {{recipient_name}},

I'd love to set up a quick sync on {{meeting_time}} to go over {{meeting_topic}}.

Agenda:
- {{agenda_items}}

Meeting Link: {{meeting_link}}

Please let me know if that time works for everyone or if we should move it by an hour.

Warmly,
{{sender_name}}`,
    placeholders: [
      {
        name: "recipient_name",
        description: "Teammate name or 'Team'",
        required: false,
        default: "Team",
      },
      { name: "meeting_topic", description: "Topic or purpose of the sync", required: true },
      { name: "meeting_time", description: "Proposed date and time", required: true },
      {
        name: "agenda_items",
        description: "Key points to cover during the meeting",
        required: false,
        default: "Architecture alignment, API contracts, and sprint tasks",
      },
      {
        name: "meeting_link",
        description: "Google Meet, Zoom, or Discord link",
        required: false,
        default: "Google Meet link in calendar invite",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "friendly",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teammate-request-help",
    name: "Request for Technical Help / Unblocking",
    category: "teammate",
    audience: "teammate",
    language: "English",
    subject: "Quick Help Needed: {{issue_summary}}",
    body: `Hi {{recipient_name}},

I am currently working on {{issue_summary}} and ran into a blocker that you might have context on.

What I am seeing:
- Problem: {{error_or_blocker}}
- What I have tried so far: {{attempted_fixes}}

Do you have 10 minutes today to take a quick look with me, or could you point me in the right direction?

Thanks so much,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Teammate name", required: true },
      { name: "issue_summary", description: "Component, feature, or bug title", required: true },
      { name: "error_or_blocker", description: "Specific error or blocker encountered", required: true },
      {
        name: "attempted_fixes",
        description: "Steps you already tried before asking",
        required: false,
        default: "Checked the logs, verified env variables, and stepped through the handler",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "friendly",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teammate-code-review",
    name: "Pull Request / Code Review Request",
    category: "teammate",
    audience: "teammate",
    language: "English",
    subject: "Code Review Request: {{pr_title}}",
    body: `Hi {{recipient_name}},

I just opened a pull request for {{pr_title}} and would appreciate your review when you have a moment.

- PR Link: {{pr_link}}
- Summary of Changes: {{changes_summary}}
- Testing Done: {{testing_notes}}

Please let me know if you have any suggestions or questions on the implementation!

Best,
{{sender_name}}`,
    placeholders: [
      {
        name: "recipient_name",
        description: "Reviewer name or 'Team'",
        required: false,
        default: "Team",
      },
      { name: "pr_title", description: "Title of the PR or feature branch", required: true },
      { name: "pr_link", description: "URL to the GitHub/GitLab pull request", required: true },
      { name: "changes_summary", description: "Brief overview of what changed", required: true },
      {
        name: "testing_notes",
        description: "How the change was tested",
        required: false,
        default: "Unit tests added and verified locally against staging data",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teammate-standup-summary",
    name: "Daily / Async Standup Summary",
    category: "teammate",
    audience: "teammate",
    language: "English",
    subject: "Standup Update - {{sender_name}} ({{standup_date}})",
    body: `Hello {{recipient_name}},

Here is my standup update for {{standup_date}}:

Yesterday / Completed:
- {{done_items}}

Today / In Progress:
- {{today_items}}

Blockers:
- {{blockers}}

Best,
{{sender_name}}`,
    placeholders: [
      {
        name: "recipient_name",
        description: "Team or channel name",
        required: false,
        default: "Team",
      },
      {
        name: "standup_date",
        description: "Date of standup",
        required: false,
        default: "Today",
      },
      { name: "done_items", description: "Tasks completed recently", required: true },
      { name: "today_items", description: "Tasks planned for today", required: true },
      {
        name: "blockers",
        description: "Any blockers or dependencies",
        required: false,
        default: "None — all clear!",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "concise",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teammate-deadline-reminder",
    name: "Teammate Deliverable / Deadline Reminder",
    category: "teammate",
    audience: "teammate",
    language: "English",
    subject: "Reminder: {{deliverable_name}} Due on {{deadline}}",
    body: `Hi {{recipient_name}},

I wanted to send a quick reminder that {{deliverable_name}} for {{project_name}} is due on {{deadline}}.

Because {{dependency_reason}}, please let me know if you are on track or if you need a hand wrapping up any remaining parts.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Teammate name", required: true },
      { name: "project_name", description: "Group project or sprint name", required: true },
      { name: "deliverable_name", description: "Specific task or module needed", required: true },
      { name: "deadline", description: "Upcoming deadline date/time", required: true },
      {
        name: "dependency_reason",
        description: "Why this deadline is important for the rest of the team",
        required: false,
        default: "we need time to integrate and test everyone's modules before submission",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "teammate-apology-missed-work",
    name: "Apology for Missed Deadline or Meeting",
    category: "teammate",
    audience: "teammate",
    language: "English",
    subject: "Sincere Apology Regarding {{missed_item}}",
    body: `Dear {{recipient_name}},

I sincerely apologize for missing {{missed_item}} due to {{reason}}. I take full responsibility for the delay caused to the team.

To make up for this right away, I have {{make_up_action}} and will have the completed work ready by {{new_completion_time}}. Thank you for your patience and understanding.

With sincere apologies,
{{sender_name}}`,
    placeholders: [
      {
        name: "recipient_name",
        description: "Teammate name or 'Team'",
        required: false,
        default: "Team",
      },
      { name: "missed_item", description: "Task, deadline, or meeting that was missed", required: true },
      {
        name: "reason",
        description: "Brief explanation without making excuses",
        required: false,
        default: "an unexpected personal emergency",
      },
      {
        name: "make_up_action",
        description: "Concrete steps already taken to catch up",
        required: false,
        default: "completed the core implementation and pushed my progress to the branch",
      },
      {
        name: "new_completion_time",
        description: "Exact time when the remaining work will be delivered",
        required: true,
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "apologetic",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },

  // ==========================================
  // GENERAL TEMPLATES (6)
  // ==========================================
  {
    id: "general-follow-up",
    name: "Professional Follow-Up Email",
    category: "general",
    audience: "general",
    language: "English",
    subject: "Following Up: {{subject_topic}}",
    body: `Dear {{recipient_name}},

I hope you are having a great week. I am writing to follow up on my previous message regarding {{subject_topic}}.

{{follow_up_context}}

Please let me know if you need any additional information from my side. I look forward to hearing from you when convenient.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Recipient's name", required: true },
      { name: "subject_topic", description: "Topic or previous email subject", required: true },
      {
        name: "follow_up_context",
        description: "Key question or next step you are following up on",
        required: false,
        default: "I wanted to check if you had a chance to review the details and share your thoughts.",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "general-thank-you",
    name: "General Professional Thank-You",
    category: "general",
    audience: "general",
    language: "English",
    subject: "Thank You for {{reason}}",
    body: `Dear {{recipient_name}},

Thank you very much for {{reason}}. I truly appreciate your time, generosity, and insights regarding {{specific_detail}}.

I look forward to staying in touch and working together in the future.

Warm regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Recipient's name", required: true },
      { name: "reason", description: "What you are thanking them for", required: true },
      {
        name: "specific_detail",
        description: "Specific takeaway or helpful gesture",
        required: false,
        default: "our recent conversation",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "general-introduction",
    name: "Self-Introduction / Networking Email",
    category: "general",
    audience: "general",
    language: "English",
    subject: "Introduction: {{sender_name}} - {{introduction_context}}",
    body: `Dear {{recipient_name}},

I hope this email finds you well. My name is {{sender_name}}, and I am {{sender_background}}.

I am reaching out regarding {{introduction_context}}. {{connection_purpose}}

Thank you for your time, and I would be delighted to connect briefly at your convenience.

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Recipient's name", required: true },
      {
        name: "sender_background",
        description: "Your current role, major, or background",
        required: false,
        default: "a computer science student and freelance web developer",
      },
      {
        name: "introduction_context",
        description: "Reason for introducing yourself or mutual connection",
        required: true,
      },
      {
        name: "connection_purpose",
        description: "Specific call-to-action or topic you want to discuss",
        required: false,
        default: "I admire your work in this space and would love to exchange ideas.",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "general-cold-outreach",
    name: "Freelance Web Development / Cold Outreach",
    category: "general",
    audience: "general",
    language: "English",
    subject: "Idea for Improving {{target_company}}'s {{value_area}}",
    body: `Dear {{recipient_name}},

I recently visited {{target_company}} and was impressed by {{compliment}}. While exploring your site, I noticed an opportunity to improve {{value_area}}.

As a web developer specializing in fast, conversion-focused web applications, I have helped similar projects achieve {{past_result}}. I put together a quick 3-point breakdown of how {{target_company}} could implement this improvement.

Would you be open to me sending over those notes, or hopping on a brief 10-minute call next week?

Best regards,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Prospect's name", required: true },
      { name: "target_company", description: "Company or organization name", required: true },
      {
        name: "compliment",
        description: "Genuine observation about their product or business",
        required: false,
        default: "your product offerings and brand presence",
      },
      {
        name: "value_area",
        description: "Specific area you can help improve (e.g., page load speed, mobile checkout)",
        required: true,
      },
      {
        name: "past_result",
        description: "Relevant proof point or capability",
        required: false,
        default: "faster load times and cleaner user onboarding flows",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "polite",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "general-resignation-leave",
    name: "Formal Resignation / Extended Leave Notice",
    category: "general",
    audience: "general",
    language: "English",
    subject: "Notice of {{notice_type}} - {{sender_name}}",
    body: `Dear {{recipient_name}},

Please accept this letter as formal notification of my {{notice_type}} from my role as {{role_title}} at {{organization_name}}, effective {{effective_date}}.

I am deeply grateful for the opportunities and mentorship I have experienced during my time at {{organization_name}}. Over the next {{handover_period}}, I will document all ongoing responsibilities and ensure a smooth transition for the team.

Thank you once again for your support, and I wish you and {{organization_name}} continued success.

Sincerely,
{{sender_name}}`,
    placeholders: [
      { name: "recipient_name", description: "Manager or supervisor name", required: true },
      {
        name: "notice_type",
        description: "Resignation or Extended Leave",
        required: false,
        default: "Resignation",
      },
      {
        name: "role_title",
        description: "Your position or role title",
        required: false,
        default: "Web Developer",
      },
      { name: "organization_name", description: "Company, lab, or organization name", required: true },
      { name: "effective_date", description: "Last day or leave start date", required: true },
      {
        name: "handover_period",
        description: "Notice period for handover",
        required: false,
        default: "two weeks",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "formal",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
  {
    id: "general-complaint",
    name: "Formal Service / Issue Complaint",
    category: "general",
    audience: "general",
    language: "English",
    subject: "Formal Complaint Regarding {{issue_subject}} (Ref: {{reference_number}})",
    body: `Dear {{recipient_name}},

I am writing to formally bring to your attention an unresolved issue regarding {{issue_subject}} (Reference: {{reference_number}}), which occurred on {{incident_date}}.

Specifically, {{issue_description}}. To resolve this matter fairly, I request {{desired_resolution}} by {{resolution_deadline}}.

Please confirm receipt of this message and let me know the next steps toward resolving this issue.

Regards,
{{sender_name}}`,
    placeholders: [
      {
        name: "recipient_name",
        description: "Support team or manager name",
        required: false,
        default: "Customer Support Team",
      },
      { name: "issue_subject", description: "Product, service, or billing issue", required: true },
      {
        name: "reference_number",
        description: "Order ID, account ID, or ticket number",
        required: false,
        default: "N/A",
      },
      {
        name: "incident_date",
        description: "Date when the issue happened",
        required: false,
        default: "recently",
      },
      { name: "issue_description", description: "Clear factual description of the issue", required: true },
      { name: "desired_resolution", description: "What resolution or action you expect", required: true },
      {
        name: "resolution_deadline",
        description: "Date by which you expect a response",
        required: false,
        default: "within 5 business days",
      },
      {
        name: "sender_name",
        description: "Your full name",
        required: false,
        default: "Your Name",
      },
    ],
    tone: "firm",
    is_builtin: true,
    created_at: SEED_TIMESTAMP,
  },
];

export const BANGLA_VARIANT_MAP: Record<string, string> = {
  "teacher-extension-request": "teacher-extension-request-bn",
  "teacher-absence-notice": "teacher-absence-notice-bn",
  "teacher-meeting-request": "teacher-meeting-request-bn",
};
