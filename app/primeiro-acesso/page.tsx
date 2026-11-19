import PrimeiroAcessoClient from './primeiro-acesso-client';

export default async function PrimeiroAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return (
    <PrimeiroAcessoClient
      initialToken={typeof token === 'string' ? token : ''}
    />
  );
}
