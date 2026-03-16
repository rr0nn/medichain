"use client"

import Image from "next/image";
import styled from "styled-components";
import Link from 'next/link'

const ResultPage = styled.div`
  width: 100%;
  min-height: 100vh;
  text-align: center;
  background-color: #ffffff;

  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Header = styled.div`
  width: 100%;
  height: 120px;
  text-align: center;
  background-color: #ffffff;
  border-bottom: 2px solid #000000;
  box-shadow: 0px 7px 10px rgba(0, 0, 0, 0.3);
  font-size: 36px;
  font-weight: bold;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;


const DifferentialDiagnosis = styled.div`
  width: 50%;
  background-color: #ffffff;
  border-radius: 25px;
  margin-top: 65px;
  font-weight: bold;
  box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.3);

  display: flex;
  flex-direction: column;
  align-items: center;  
`;

const LinkHome = styled(Link)`
  text-decoration: underline;
  position: absolute;
  margin-left: 80%;
  color: #1B7D7E;
  font-size: 30px;
  `
const BoxFormatingOverall = styled.div`
  display: flex;
  flex-direction: row;
`

const BoxFormatingColumn= styled.div`
  display: flex;
  flex-direction: column;
  width: 50%;
  padding-left: 10px;
`
const ConfidenceFormating = styled.div`
  display: flex;
  flex-direction: column;
  mergin-right: 80%;
  width: 50%;
  text-align: right;
  padding-right: 25px;
  color: #2e3f50;
  font-weight: 550;
`
const ConfidenceScoreFormating = styled.div`
  padding-top: 10px;
  text-align: right;
  color: #000000;
  font-weight: bold;
`

const BoxTitle = styled.div`
  color: #1B7D7E;
  font-size: 25px;
  text-align: left;
  margin-top: 10px;
  margin-left: 5%;
  width: 100%;
`

const ResultDisplay = styled.div`
  padding-left: 15px;
  padding-top: 10px;
  font-size: 20px;
  margin-top: 30px;
  width: 94%;
  text-align: left;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: #1B7D7E;
`

const DiseaseName = styled.div`
  color: #000000;
  font-size: 17px;
`

const DxResult = styled.div`
  color: #000000;
  font-weight: normal;
  font-size: 17px;
`
const BarBackground = styled.div`
  margin-top: 10px;
  width: 98%;
  background: #c2d8da;
  border-radius: 20px;
  height: 24px;
  overflow: hidden;
`;

const BarFill = styled.div<{ widthPercent: number}>`
  width: ${(props) => props.widthPercent}%;
  background-image: linear-gradient(to right, #5fa7ff, #7bfee2); 
  height: 100%;
`;

const TraceMatch = styled.div`
  margin-top: 15px;
  color: #000000;
  font-weight: normal;
  font-size: 17px;
  border-radius: 40px;
  border: 3px solid #bdcdce;
  display: inline-block;
  padding-left: 10px;
  padding-right: 10px;
`

const FillerDiv = styled.div`
  margin-top: 10px;
`

export default function Home() {
  

  return (
    <ResultPage>
      <Header>
        <Image
          src="/medichain.png"
          alt="Medichain logo"
          width={200}
          height={200}
          style={{ position: "absolute", marginRight: "80%" }}
        />
        Diagnostic Reasoning For Final Results
        <LinkHome href="/">Back to ChatBot</LinkHome>
      </Header>
      <DifferentialDiagnosis>
        <BoxTitle>
          Ranked Output For Differential Diagnosis
        </BoxTitle>
        <ResultDisplay>
          <BoxFormatingOverall>
            <BoxFormatingColumn>
              Rank 1
              <DiseaseName>
                Gastric volvulus
              </DiseaseName>
              <DxResult>
                dx:gastric_volvulus
              </DxResult>
            </BoxFormatingColumn>
            <ConfidenceFormating>
              Confidence
              <ConfidenceScoreFormating>
                92%
              </ConfidenceScoreFormating>
            </ConfidenceFormating>
          </BoxFormatingOverall>
          
          <BarBackground>
            <BarFill widthPercent={92}/>
          </BarBackground>
          <TraceMatch>something </TraceMatch>
          <FillerDiv></FillerDiv>
        </ResultDisplay>
        <ResultDisplay>
          Rank 2
          <DiseaseName>
            Gastric volvulus
          </DiseaseName>
          <DxResult>
            dx:gastric_volvulus
          </DxResult>
          <BarBackground>
            <BarFill widthPercent={68}/>
          </BarBackground>
          <TraceMatch>something </TraceMatch>
          <FillerDiv></FillerDiv>
        </ResultDisplay>
        <ResultDisplay>
          Rank 3
          <DiseaseName>
            Gastric volvulus
          </DiseaseName>
          <DxResult>
            dx:gastric_volvulus
          </DxResult>
          <BarBackground>
            <BarFill widthPercent={52}/>
          </BarBackground>
          <TraceMatch>something </TraceMatch>
          <FillerDiv></FillerDiv>
        </ResultDisplay>
      </DifferentialDiagnosis>
    </ResultPage>
  );
}
