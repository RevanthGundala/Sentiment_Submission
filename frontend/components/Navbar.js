import { Box, Flex, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import SearchBar from "./SearchBar";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  return (
    <Box bg="gray.200" py={4}>
      <Flex maxW="container.lg" mx="auto" align="center" justify="space-between">
        <Box>
          <Link as={NextLink} href="/" fontSize="xl" fontWeight={"bold"} >
            Sentiment
          </Link>
        </Box>
        <Box>
          <SearchBar />
        </Box>
        <Box>
          <ConnectButton />
        </Box>
      </Flex>
    </Box>
  );
}
