package com.example.socialservice.mapper;

import com.example.socialservice.dto.LoginResponse;
import com.example.socialservice.dto.RegisterResponse;
import com.example.socialservice.dto.UserProfileResponse;
import com.example.socialservice.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {
    RegisterResponse toRegisterResponse(User user);

    @Mapping(target = "token", source = "token")
    @Mapping(target = "refreshToken", source = "refreshToken")
    LoginResponse toLoginResponse(User user, String token, String refreshToken);

    UserProfileResponse toProfileResponse(User user);
}
