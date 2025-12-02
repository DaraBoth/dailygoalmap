
import React, { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { debounce } from 'lodash';
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  onSearch,
  placeholder = "Search goals..."
}) => {
  const [value, setValue] = useState("");
  
  // Create a debounced search function to avoid excessive calls
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setValue(query);
    debouncedSearch(query);
  };
  
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        className="pl-9 h-10 bg-background border-border"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default SearchInput;
