package com.example.socialservice.mapper;

import com.example.socialservice.dto.LoginResponse;
import com.example.socialservice.dto.RegisterResponse;
import com.example.socialservice.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {
    RegisterResponse toRegisterResponse(User user);

    @Mapping(target = "token", source = "token")
    LoginResponse toLoginResponse(User user, String token);
}

