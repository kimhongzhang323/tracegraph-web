import { SignIn as ClerkSignIn } from '@clerk/clerk-react'

export function SignIn() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16 bg-ink-50/60 dark:bg-ink-950/40">
      <ClerkSignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/trace"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-card border hairline dark:bg-ink-950 dark:border-ink-800',
            headerTitle: 'text-ink-950 dark:text-white font-semibold tracking-tight',
            headerSubtitle: 'text-ink-600 dark:text-ink-400',
            socialButtonsBlockButton: 'border hairline dark:border-ink-800 dark:bg-ink-900 dark:text-white hover:dark:bg-ink-800',
            dividerLine: 'bg-ink-200 dark:bg-ink-800',
            dividerText: 'text-ink-500',
            formFieldLabel: 'text-ink-700 dark:text-ink-300',
            formFieldInput: 'border hairline dark:bg-ink-900 dark:text-white dark:border-ink-700',
            formButtonPrimary: 'bg-ink-950 hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100',
            footerActionLink: 'text-accent-600 dark:text-accent-400 hover:underline',
            identityPreviewText: 'text-ink-950 dark:text-white',
            identityPreviewEditButton: 'text-ink-600 dark:text-ink-400',
          },
        }}
      />
    </div>
  )
}
