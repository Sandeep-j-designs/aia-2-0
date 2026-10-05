/**
 * PROTOTYPE STUB — same path and same signature as hooks/withSession.tsx in
 * aiaccountant-app.
 *
 * Production gates the wrapped component on the next-auth session status,
 * showing PageLoading while it resolves and redirecting to "/" when
 * unauthenticated. A prototype has no session, so this passes straight through.
 *
 * The point of the stub is that feature components can write
 *
 *   export default withSession(MyFeature);
 *
 * exactly as production does. On handoff this file is DELETED and the real
 * withSession takes over with no change to the feature code.
 */
export function withSession<P>(WrappedComponent: React.ComponentType<P>) {
  return function WithSession(props: P) {
    return <WrappedComponent {...(props as P & JSX.IntrinsicAttributes)} />;
  };
}
