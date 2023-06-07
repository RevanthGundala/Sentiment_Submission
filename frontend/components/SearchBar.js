import { useState } from "react";
import { useRouter } from "next/router";
import { Input, Button, Flex, IconButton } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";

export default function SearchBar() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchText.trim() !== "") {
      router.push(`/s/${encodeURIComponent(searchText)}`);
    }
  };

  const handleChange = (e) => {
    setSearchText(e.target.value);
  };

  return (
    <Flex align="center" justify="center" mt={4}>
      <form onSubmit={handleSearch}>
        <Flex>
          <Input
            type="text"
            placeholder="Enter protocol name"
            value={searchText}
            onChange={handleChange}
            mr={2}
          />
          <IconButton type="submit" colorScheme="blue" aria-label='Search database' icon={<SearchIcon />} />
        </Flex>
      </form>
    </Flex>
  );
}
