import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./messages/en.json",
  },
});

export default withNextIntl(nextConfig);
