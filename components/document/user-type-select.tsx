"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserTypeSelect({
  userType,
  setUserType,
  onClickHandler,
}: UserTypeSelectorParams) {
  const handleChange = (type: UserType) => {
    setUserType(type);
    onClickHandler?.(type);
  };

  return (
    <Select value={userType} onValueChange={(type: UserType) => handleChange(type)}>
      <SelectTrigger className="h-8 w-[100px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="viewer">can view</SelectItem>
        <SelectItem value="editor">can edit</SelectItem>
      </SelectContent>
    </Select>
  );
}
