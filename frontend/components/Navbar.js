import { Box, Flex, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import SearchBar from "./SearchBar";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  return (
    <Box bg="gray.200" py={4}>
      <Flex maxW="container.lg" mx="auto" align="center" justify="space-between">
        <Box flex={2}>
          <Link as={NextLink} href="/" fontSize="2xl" fontWeight="bold" marginLeft="2rem">
            Sentiment
          </Link>
        </Box>
        <Box flex={5} mb={2} textAlign="center">
          <SearchBar />
        </Box>
        <Box flex={1} textAlign="right" marginRight="2rem">
          <ConnectButton />
        </Box>
      </Flex>
    </Box>
  );
}
